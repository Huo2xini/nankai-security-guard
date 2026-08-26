import argparse
import hashlib
import html
import json
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path


DEFAULT_SEEDS = [
    ("通知公告", "https://guard.nankai.edu.cn/10127/listm.htm"),
    ("法规制度", "https://guard.nankai.edu.cn/10122/list.htm"),
    ("国家安全法律法规", "https://guard.nankai.edu.cn/10131/list.htm"),
    ("学校安全规章制度", "https://guard.nankai.edu.cn/10132/list.htm"),
]
ALLOWED_DOMAINS = {"guard.nankai.edu.cn", "www.nankai.edu.cn", "news.nankai.edu.cn"}
ATTACHMENT_EXTS = (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".rar")


@dataclass
class Link:
    url: str
    text: str


class LinkParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self._href = urllib.parse.urljoin(self.base_url, html.unescape(href))
            self._text = []

    def handle_data(self, data):
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href:
            self.links.append(Link(self._href, clean_text(" ".join(self._text))))
            self._href = None
            self._text = []


def clean_text(value):
    value = html.unescape(value or "")
    value = re.sub(r"<script\b.*?</script>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<style\b.*?</style>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def fetch_text(url, timeout=15):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "NankaiSecurityGuardPolicySync/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    context = ssl._create_unverified_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        data = response.read()
        content_type = response.headers.get("content-type", "")
    charset_match = re.search(r"charset=([\w-]+)", content_type, flags=re.I)
    encodings = [charset_match.group(1)] if charset_match else []
    encodings += ["utf-8", "gb18030"]
    for encoding in encodings:
        try:
            return data.decode(encoding)
        except Exception:
            continue
    return data.decode("utf-8", "ignore")


def parse_links(text, base_url):
    parser = LinkParser(base_url)
    parser.feed(text)
    return parser.links


def is_allowed_url(url):
    return urllib.parse.urlparse(url).netloc.lower() in ALLOWED_DOMAINS


def is_article_url(url):
    path = urllib.parse.urlparse(url).path.lower()
    return path.endswith("/page.htm") or ("/c101" in path and path.endswith("page.htm"))


def is_attachment_url(url):
    path = urllib.parse.urlparse(url).path.lower()
    return path.endswith(ATTACHMENT_EXTS) or "/_upload/" in path


def extract_title(text, fallback):
    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", text, flags=re.I | re.S)
    if h1_match:
        title = clean_text(h1_match.group(1))
        if title:
            return title
    title_match = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.I | re.S)
    if title_match:
        title = clean_text(title_match.group(1))
        title = re.sub(r"[-_ ]*南开大学.*$", "", title).strip()
        if title:
            return title
    return fallback or "未命名政策"


def extract_date(text):
    candidates = re.findall(r"(20\d{2}[-./年]\d{1,2}[-./月]\d{1,2}日?)", text)
    if not candidates:
        return ""
    value = candidates[0].replace("年", "-").replace("月", "-").replace("日", "")
    value = value.replace("/", "-").replace(".", "-")
    parts = value.split("-")
    if len(parts) == 3:
        return f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
    return value


def extract_article_text(text):
    body_match = re.search(
        r"<div[^>]+class=[\"'][^\"']*(?:wp_articlecontent|article|content)[^\"']*[\"'][^>]*>(.*?)</div>",
        text,
        flags=re.I | re.S,
    )
    raw = body_match.group(1) if body_match else text
    content = clean_text(raw)
    content = re.sub(r"版权所有.*$", "", content)
    return content[:12000]


def article_hash(article):
    source = "\n".join(
        [article.get("title", ""), article.get("date", ""), article.get("url", ""), article.get("content", "")]
    )
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def discover_articles(seeds, limit=None):
    rows = []
    seen = set()
    for category, list_url in seeds:
        try:
            list_text = fetch_text(list_url)
        except Exception as exc:
            print(f"[WARN] list fetch failed: {list_url} {exc}", file=sys.stderr)
            continue
        for link in parse_links(list_text, list_url):
            if not is_allowed_url(link.url) or not is_article_url(link.url) or link.url in seen:
                continue
            seen.add(link.url)
            rows.append((category, link.text, link.url))
            if limit and len(rows) >= limit:
                return rows
    return rows


def build_articles(article_rows):
    articles = []
    for index, (category, list_title, url) in enumerate(article_rows, 1):
        print(f"[{index}/{len(article_rows)}] {category}: {list_title or url}")
        try:
            text = fetch_text(url)
        except Exception as exc:
            print(f"[WARN] article fetch failed: {url} {exc}", file=sys.stderr)
            continue
        links = parse_links(text, url)
        attachments = [
            {"title": link.text or Path(urllib.parse.urlparse(link.url).path).name, "url": link.url}
            for link in links
            if is_allowed_url(link.url) and is_attachment_url(link.url)
        ]
        article = {
            "category": category,
            "title": extract_title(text, list_title),
            "date": extract_date(text),
            "url": url,
            "content": extract_article_text(text),
            "attachments": attachments,
            "synced_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        article["hash"] = article_hash(article)
        articles.append(article)
    articles.sort(key=lambda item: (item.get("date") or "", item.get("title") or ""), reverse=True)
    return articles


def write_outputs(articles, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    generated_at = time.strftime("%Y-%m-%d %H:%M:%S")
    manifest = {
        "source": "南开大学保卫处官网",
        "source_home": "https://guard.nankai.edu.cn/",
        "generated_at": generated_at,
        "article_count": len(articles),
        "allowed_domains": sorted(ALLOWED_DOMAINS),
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    with (output_dir / "articles.jsonl").open("w", encoding="utf-8") as file:
        for article in articles:
            file.write(json.dumps(article, ensure_ascii=False) + "\n")
    with (output_dir / "articles.md").open("w", encoding="utf-8") as file:
        file.write("# 南开大学保卫处官网同步清单\n\n")
        file.write(f"- 同步时间: {generated_at}\n")
        file.write("- 来源: https://guard.nankai.edu.cn/\n")
        file.write(f"- 文章数量: {len(articles)}\n\n")
        for article in articles:
            file.write(f"## {article['title']}\n\n")
            file.write(f"- 栏目: {article['category']}\n")
            file.write(f"- 发布日期: {article['date'] or '官网未标明'}\n")
            file.write(f"- 来源链接: {article['url']}\n\n")
    with (output_dir / "coze_knowledge.md").open("w", encoding="utf-8") as file:
        file.write("# 南开大学保卫处官网政策知识库\n\n")
        file.write("本文件由同步脚本从南开大学保卫处官网生成。回答时应优先引用原始来源链接和发布日期。\n\n")
        for article in articles:
            file.write(f"## {article['title']}\n\n")
            file.write(f"栏目: {article['category']}\n\n")
            file.write(f"发布日期: {article['date'] or '官网未标明'}\n\n")
            file.write(f"来源链接: {article['url']}\n\n")
            file.write(f"正文摘要/全文:\n{article['content']}\n\n")
            if article["attachments"]:
                file.write("附件链接:\n")
                for attachment in article["attachments"]:
                    file.write(f"- {attachment['title']}: {attachment['url']}\n")
                file.write("\n")
            file.write("---\n\n")


def main():
    parser = argparse.ArgumentParser(description="Sync Nankai security policy pages for Coze knowledge.")
    parser.add_argument("--output", default="data/guard_policy_sync", help="Output directory.")
    parser.add_argument("--limit", type=int, default=0, help="Limit article count for testing.")
    args = parser.parse_args()
    articles = build_articles(discover_articles(DEFAULT_SEEDS, limit=args.limit or None))
    if not articles:
        print("No articles were synced. Check network access or source page structure.", file=sys.stderr)
        sys.exit(2)
    write_outputs(articles, Path(args.output))
    print(f"Synced {len(articles)} articles into {Path(args.output).resolve()}")


if __name__ == "__main__":
    main()



