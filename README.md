本站基于 Beautiful Jekyll 主题（MIT，见 LICENSE）改造，主题代码已全部在本仓库内，独立维护。
主题原始文档（查配置项时可参考）: https://github.com/daattali/beautiful-jekyll

本地预览: bundle install && bundle exec jekyll serve --livereload ，然后打开 http://127.0.0.1:4000


_data: 不用管
用于存放结构化数据（YAML/JSON/CSV 格式），这些数据可以在页面中用 site.data 引用，例如导航菜单、项目列表等。
例外: _data/travel.yml 是 Travel 页面世界地图的数据，每去一个新地方就在里面加一条（文件开头有写法说明）。

_includes: 不用管
包含可复用的 HTML 片段，供页面或布局文件通过 {% include filename.html %} 引入。比如页眉、页脚、社交图标等。

_layouts：不用管，但是有不同的布局可以选择
定义网站的页面结构模板，如 default.html 是默认布局。页面中通过 layout: default 来指定使用的布局。

_posts
存放博客文章，每篇文章应以 YYYY-MM-DD-title.md 命名。Jekyll 会自动识别这些并生成博客页面。

.github
GitHub 用于配置仓库行为的目录，如 issue 模板、CI workflows 等。

assets
存放网站的静态资源（静态文件），分为：

css/: 样式表文件

data/: 其他静态数据资源（可能供 JavaScript 使用）

img/: 图片资源

js/: JavaScript 文件

_config.yml
网站的核心配置文件，比如站点标题、作者、导航、插件等。你可以在这里自定义大部分内容。

.gitattributes
Git 配置文件，用于控制文件的属性处理方式（如换行符、合并策略等）。

.gitignore
列出 Git 在提交时应忽略的文件/目录（如 .DS_Store、_site、node_modules 等）。

404.html
自定义的“页面未找到”页面，当用户访问不存在的链接时会显示。

aboutme.md
关于页面的内容，通常包含你的个人简介。此页面可能通过 _config.yml 中的导航条被链接。

CNAME: 不用管
用于自定义域名（如果你绑定了自己的域名而不是使用 GitHub Pages 的默认域名）。

feed.xml: 不用管
RSS 订阅源，让别人可以订阅你的网站更新。

Gemfile: 不用管
用于指定 Jekyll 和相关插件的 Ruby gem 依赖。
如果你只使用 GitHub Pages 托管网站，完全不用管 Gemfile。
如果你想在本地预览/调试网站，那么你就需要用它配合 bundle install + jekyll serve。

index.html
主页的内容（或引用布局）。是用户访问网站根目录时显示的主页面。

LICENSE:不用管
版权许可证文件，通常为 MIT 或其他开源协议。

README.md
项目说明文档，说明如何使用和配置该项目，一般用于 GitHub 展示页面。

tags.html: 不用管
“标签索引页”是指一个专门展示所有标签及其相关文章的页面，就像一本书的“索引”部分，用来帮助读者快速找到他们感兴趣的内容。这是自动生成的不用管。




调整_config.yml，以便加载出favicon

# ---  Add / update these two lines  -----------------
url: "https://jimmy-zhang-1998.com"   # full canonical URL, no trailing slash
baseurl: ""                      # **empty string** because the site lives at /
# -------------


personal-website/_includes/head.html里的


# ---------------
  {% assign favicon_exists = site.static_files | where: "path", "/favicon.ico" | size %}
  {% if favicon_exists == 1 %}
  <link rel="icon" href="{{ '/favicon.ico?' | relative_url }}" />
  {% endif %}

  <link rel="icon" href="/favicon.ico?" sizes="any">

# --------------