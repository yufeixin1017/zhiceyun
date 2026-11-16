from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "提交材料"
OUT.mkdir(exist_ok=True)
DOCX_PATH = OUT / "智测云-技术文档.docx"

PRIMARY = "4C51C6"
DARK = "202A44"
MUTED = "64748B"
LIGHT = "EEF0FF"
BORDER = "D8DDF0"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_run_font(run, name="PingFang SC", size=None, bold=None, color=None):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    if size:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_page_field(paragraph, field):
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = field
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.extend([fld_char1, instr, fld_char2])
    set_run_font(run, size=8, color=MUTED)


doc = Document()
section = doc.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(1.8)
section.bottom_margin = Cm(1.7)
section.left_margin = Cm(1.85)
section.right_margin = Cm(1.85)
section.header_distance = Cm(0.8)
section.footer_distance = Cm(0.8)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "PingFang SC"
normal._element.rPr.rFonts.set(qn("w:eastAsia"), "PingFang SC")
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor.from_string(DARK)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.3

for name, size, color in (("Heading 1", 18, PRIMARY), ("Heading 2", 13, DARK), ("Heading 3", 11, PRIMARY)):
    style = styles[name]
    style.font.name = "PingFang SC"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "PingFang SC")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(color)
    style.paragraph_format.space_before = Pt(8)
    style.paragraph_format.space_after = Pt(8)
    style.paragraph_format.keep_with_next = True

for name in ("Title", "Subtitle"):
    style = styles[name]
    style.font.name = "PingFang SC"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "PingFang SC")

if "Code Block" not in styles:
    code_style = styles.add_style("Code Block", WD_STYLE_TYPE.PARAGRAPH)
else:
    code_style = styles["Code Block"]
code_style.font.name = "Menlo"
code_style._element.rPr.rFonts.set(qn("w:eastAsia"), "Menlo")
code_style.font.size = Pt(8.5)
code_style.font.color.rgb = RGBColor.from_string("26335C")
code_style.paragraph_format.left_indent = Cm(0.45)
code_style.paragraph_format.right_indent = Cm(0.25)
code_style.paragraph_format.space_before = Pt(4)
code_style.paragraph_format.space_after = Pt(7)
code_style.paragraph_format.line_spacing = 1.1

header = section.header.paragraphs[0]
header.text = "智测云 · AI 随堂测验生成与自动评阅平台"
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
for run in header.runs:
    set_run_font(run, size=8, color=MUTED)
footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = footer.add_run("第 ")
set_run_font(run, size=8, color=MUTED)
add_page_field(footer, "PAGE")
run = footer.add_run(" 页 / 共 ")
set_run_font(run, size=8, color=MUTED)
add_page_field(footer, "NUMPAGES")
run = footer.add_run(" 页")
set_run_font(run, size=8, color=MUTED)


def add_heading(text, level=1):
    return doc.add_heading(text, level=level)


def add_para(text="", bold_prefix=None, color=None, align=None, size=None):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    if bold_prefix and text.startswith(bold_prefix):
        first = p.add_run(bold_prefix)
        set_run_font(first, size=size or 10.5, bold=True, color=color or DARK)
        rest = p.add_run(text[len(bold_prefix):])
        set_run_font(rest, size=size or 10.5, color=color or DARK)
    else:
        run = p.add_run(text)
        set_run_font(run, size=size or 10.5, color=color or DARK)
    return p


def add_bullets(items):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(item)
        set_run_font(run, size=10.2)


def add_code(text):
        return doc.add_paragraph(text, style="Code Block")


def add_table(headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.autofit = False
    if widths:
        for i, width in enumerate(widths):
            table.columns[i].width = Cm(width)
    header_cells = table.rows[0].cells
    for i, text in enumerate(headers):
        header_cells[i].text = str(text)
        set_cell_shading(header_cells[i], PRIMARY)
        set_cell_margins(header_cells[i])
        if widths:
            header_cells[i].width = Cm(widths[i])
        for run in header_cells[i].paragraphs[0].runs:
            set_run_font(run, size=9, bold=True, color="FFFFFF")
    set_repeat_table_header(table.rows[0])
    for row_values in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row_values):
            cells[i].text = str(value)
            set_cell_margins(cells[i])
            if widths:
                cells[i].width = Cm(widths[i])
            for run in cells[i].paragraphs[0].runs:
                set_run_font(run, size=9)
        prevent_row_split(table.rows[-1])
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def new_section(title, subtitle=None):
    doc.add_page_break()
    add_heading(title, 1)
    if subtitle:
        add_para(subtitle, color=MUTED, size=10)


# 封面
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(70)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("智测云")
set_run_font(run, size=34, bold=True, color=PRIMARY)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("面向高校课堂的 AI 随堂测验生成与自动评阅平台")
set_run_font(run, size=16, bold=True, color=DARK)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("技 术 文 档")
set_run_font(run, size=20, bold=True, color=PRIMARY)
for _ in range(2):
    doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("2026 第九届传智杯全国大学生数智创新与 AI 应用大赛\nAI 创新应用挑战赛 · 方向四：低代码与智能表单生成引擎")
set_run_font(run, size=11, color=MUTED)
for _ in range(5):
    doc.add_paragraph()
add_table(["项目", "内容"], [
    ["项目名称", "智测云——AI 随堂测验生成与自动评阅平台"],
    ["作品形态", "Next.js 全栈 Web 应用＋MySQL 数据库＋公网移动作答"],
    ["代码仓库", "https://github.com/yufeixin1017/zhiceyun"],
    ["文档版本", "2026 年 11 月 · 省赛提交版"],
], widths=[3.2, 12.8])
add_para("本作品以真实 Vibe Coding 协同过程完成，文档中的迭代、报错和验证均可由代码、测试与 Git 历史交叉核对。", color=MUTED, size=9)

# 1 项目概述
new_section("1. 项目概述", "智测云将课堂随堂测拆分为 AI 生成、教师审核、学生作答和自动评阅四个环节，形成可直接使用的完整流程。")
add_heading("1.1 已实现功能", 2)
add_bullets([
    "教师输入真实课堂内容，系统仅通过大模型生成单选、多选、判断和简短填空题；",
    "教师可编辑、审核、排序和发布测验，学生通过链接或二维码在线作答；",
    "服务端自动评分，支持个人解析、班级统计、题目分布、学生名单和 CSV 导出；",
    "教师手机号注册登录，按 teacherId 隔离数据，学生无需注册；",
    "MySQL 事务化持久化，Ubuntu＋Cloudflare 公网部署，手机流量可直接访问。",
])
add_heading("1.2 验证结果", 2)
add_table(["证据类型", "当前结果"], [
    ["代码与演进", "GitHub 完整历史，材料整理前 28 次功能迭代提交"],
    ["自动化测试", "35 项单元测试，覆盖评分、权限、排序、限时、分享和时间格式"],
    ["真实模型验证", "实际 API 返回 201，6 道题、总分 100、题干答案解析完整"],
    ["持久化验证", "6 道题、2 份提交、12 条逐题答案，满分与零分均正确"],
    ["部署验证", "Node.js＋MySQL＋systemd＋Cloudflare Quick Tunnel"],
], widths=[3.5, 12.5])
add_para("公网演示地址：https://luis-gratuit-validation-iii.trycloudflare.com", bold_prefix="公网演示地址：")
add_para("测试教师账号：手机号 16666666666，密码 qwer@1234。账号仅用于比赛评审，我在 2026 年 11 月 16 日已验证可以登录。", bold_prefix="测试教师账号：")

# 2 背景与范围
new_section("2. 项目背景、真实痛点与功能边界")
add_heading("2.1 真实痛点", 2)
add_para("随堂测验需要教师临时出题、收集答案、逐份评分并统计错误。普通表单工具能收集数据，却不能直接依据课堂讲义生成结构化题目、答案和解析，也无法形成自动评阅与学情反馈闭环。智测云将这一过程组织为“内容输入—AI 生成—教师审核—移动作答—自动评阅”，在减少重复劳动的同时保留教师对题目质量的判断。")
add_heading("2.2 产品边界", 2)
add_table(["范围内", "范围外"], [
    ["单选、多选、判断、简短填空", "主观题、数学证明和计算过程评阅"],
    ["教师审核后发布，发布后锁定题目", "图片、手写、拍照阅卷"],
    ["手机号教师认证与数据隔离", "学校统一身份认证与教师管理后台"],
    ["限时倒计时、超时标记且保留统计", "把超时提交直接作废或隐藏"],
    ["高校课堂随堂形成性检测", "K12 全学段、全学科完整考试平台"],
], widths=[8, 8])

# 3 业务闭环
new_section("3. 业务闭环与角色流程")
add_heading("3.1 端到端流程", 2)
add_code("教师课堂内容\n  ↓\nAI 生成结构化题目 → 题量/题型/答案校验\n  ↓\n知识点分组与题型排序 → 教师编辑审核\n  ↓\n发布链接与二维码 → 学生手机作答\n  ↓\n服务端评分与超时标记 → 个人解析与班级统计\n  ↓\n学生名单、题目分布和 CSV 导出")
add_heading("3.2 两类角色", 2)
add_table(["角色", "主要操作", "权限边界"], [
    ["教师", "生成、编辑、发布、统计、导出", "手机号登录；只能访问本人测验和提交"],
    ["学生", "打开链接、填写姓名学号、作答、看解析", "无需账号；只能访问公开测验，不接触教师接口"],
], widths=[2.2, 7.4, 6.4])
add_para("公开学生页面使用独立的数据脱敏层，教师页面与管理 API 全部需要有效会话。", bold_prefix="公开学生页面")

# 4 架构
new_section("4. 系统架构与技术选型")
add_heading("4.1 总体架构", 2)
add_code("教师浏览器 ─┐\n              ├→ Next.js App Router / Route Handlers\n学生手机 ───┘              │\n                           ├─ AI Generator：Prompt、JSON 提取、字段归一化\n                           ├─ Zod：业务规则与 Schema 校验\n                           ├─ Scoring / Analytics：评分、限时和统计\n                           └─ Drizzle ORM → MySQL 8.x（事务与唯一约束）\n\nCloudflare → zhiceyun-tunnel → 127.0.0.1:3100 → Next.js → 本机 MySQL")
add_heading("4.2 技术栈", 2)
add_table(["层次", "选型", "选择理由"], [
    ["全栈框架", "Next.js 16＋React 19＋TypeScript", "页面、API、评分和部署统一，类型约束清晰"],
    ["数据校验", "Zod", "同时约束教师输入和模型输出，防止非法结构进入数据库"],
    ["数据库", "MySQL 8＋Drizzle ORM＋mysql2", "事务、唯一索引、连接池和可复现 SQL 迁移"],
    ["认证", "scrypt＋MySQL Session＋HttpOnly Cookie", "无额外原生依赖，密码和令牌不明文存储"],
    ["部署", "Ubuntu＋systemd＋Cloudflare", "常开主机、仅本机监听、跨网络扫码"],
], widths=[2.6, 5.5, 7.9])

# 5 Schema
new_section("5. Assessment Schema 与数据模型")
add_heading("5.1 为什么不让模型直接生成页面代码", 2)
add_para("模型只生成受约束的结构化数据，系统再将其渲染为教师编辑器和学生作答表单。这样可以统一进行字段校验、排序、持久化、评分和统计，避免模型输出不可运行的 HTML 或一次性代码。")
add_heading("5.2 单题结构示例", 2)
add_code('{\n  "type": "single_choice",\n  "stem": "模型在训练集表现很好，但在新数据上误差明显增大，称为？",\n  "options": [{"id":"A","text":"欠拟合"},{"id":"B","text":"过拟合"}],\n  "answer": ["B"],\n  "explanation": "过拟合表现为泛化能力下降。",\n  "knowledgePoint": "过拟合的概念",\n  "score": 17\n}')
add_heading("5.3 核心实体", 2)
add_table(["实体", "关键字段", "作用"], [
    ["Quiz", "teacherId、course、topic、sourceContent、duration、status", "一份完整随堂测验及发布状态"],
    ["Question", "quizId、type、stem、options、answer、knowledgePoint、score", "客观题、答案与知识点"],
    ["Submission", "quizId、studentName、studentNo、score、isLate、submittedAt", "一名学生的一次完整提交"],
    ["Answer", "submissionId、questionId、answer、earnedScore、isCorrect", "逐题答案与评分结果"],
], widths=[2.7, 7.4, 5.9])

# 6 Prompt 策略
new_section("6. 意图控制与 Prompt 工程")
add_heading("6.1 输入意图结构化", 2)
add_bullets([
    "教师必须提供课程名称、课堂主题和至少 10 个字的课堂内容；",
    "题量限定为 3–10 道，题型限定为单选、多选、判断、填空；",
    "难度分为基础、适中、进阶，答题限时由教师明确设置；",
    "不生成简答、证明、计算过程或需要上传图片的题目。",
])
add_heading("6.2 Prompt 约束", 2)
add_bullets([
    "只输出 JSON 对象，不输出 Markdown、注释或额外说明；",
    "每题必须包含 stem、type、options、answer、explanation、knowledgePoint；",
    "选择题选项 ID 使用 A、B、C、D，答案只能引用选项 ID；",
    "填空题只接受简短、明确的事实或术语，可包含等价答案；",
    "同一知识点必须复用完全一致的 knowledgePoint，避免近义表述拆分组；",
    "ID 和分值由服务端生成，避免模型计算错误或伪造标识。",
])
add_heading("6.3 输出防线", 2)
add_code("模型 JSON → JSON 提取 → 题量检查 → 字段归一化 → Zod 业务校验\n       → 服务端补充 ID/分值 → 知识点分组与排序 → 教师审核 → 发布")
add_para("模型请求失败或格式不合法时明确报错，不会静默替换成预置题目。", bold_prefix="模型请求失败")

# 7 归一化与排序
new_section("7. 模型输出归一化与确定性排序")
add_heading("7.1 真实兼容问题", 2)
add_para("不同模型可能使用 question、choices、correctAnswer、analysis 等字段。系统先归一化为统一 Schema，再执行严格业务校验。兼容别名只改变输入形式，不放宽题量、题型、选项和答案约束。")
add_table(["模型常见字段", "系统标准字段"], [
    ["question / questionText / title / 题干", "stem"],
    ["choices / 选项", "options"],
    ["correctAnswer / correct_answer / 答案", "answer"],
    ["analysis / rationale / 解析", "explanation"],
    ["knowledge_point / knowledge / 知识点", "knowledgePoint"],
], widths=[8.5, 7.5])
add_heading("7.2 确定性排序规则", 2)
add_bullets([
    "知识点分组保持第一次出现的教学顺序；",
    "同一知识点的题目必须相邻；",
    "组内固定为单选 → 多选 → 判断 → 填空；",
    "同题型多道题保持原始相对顺序；",
    "排序完成后重新分配分值，总分保持 100。",
])
add_para("最终排列由服务端决定，不依赖模型是否主动遵守排序要求。", bold_prefix="最终排列")

# 8 数据库
new_section("8. MySQL 数据关系与事务一致性")
add_heading("8.1 表关系", 2)
add_code("teachers ──< quizzes ──< questions\n    │              │\n    │              └──< submissions ──< answers\n    └──────< teacher_sessions")
add_heading("8.2 关键约束", 2)
add_table(["约束", "目的"], [
    ["quizzes.teacher_id → teachers.id", "教师数据归属与隔离"],
    ["questions (quiz_id, sort_order) 唯一", "避免同一份测验出现重复排列位置"],
    ["submissions (quiz_id, student_no) 唯一", "相同学号在同一测验中只能提交一次"],
    ["answers (submission_id, question_id) 唯一", "每次提交的一道题只保留一条作答记录"],
], widths=[7.8, 8.2])
add_heading("8.3 事务边界", 2)
add_bullets([
    "创建测验：测验与全部题目在同一事务中写入；",
    "编辑草稿：测验更新与题目重写保持一致；",
    "学生提交：整次成绩与全部逐题答案在同一事务中写入；",
    "重复学号同时由应用层检查和数据库唯一索引拦截。",
])
add_para("数据库使用 UTC 存储时间，页面与 CSV 按 Asia/Shanghai 显示。", color=MUTED)

# 9 评分与限时
new_section("9. 自动评分、答案隔离与限时规则")
add_heading("9.1 评分规则", 2)
add_table(["题型", "评分方式"], [
    ["单选 / 判断", "与标准答案完全一致得分，否则 0 分"],
    ["多选", "全对得分，不设部分分；忽略选项顺序和重复选择"],
    ["填空", "支持多个可接受答案，忽略英文大小写、全半角及多余空格"],
    ["未作答", "0 分"],
], widths=[4.2, 11.8])
add_para("成绩由服务端重新计算，不信任浏览器提交的分数。学生作答前通过 toPublicQuiz 删除 answer 和 explanation，提交后才展示标准答案与解析。")
add_heading("9.2 限时与超时", 2)
add_bullets([
    "截止时刻 = 教师发布时间 + 答题限时；",
    "学生页面显示倒计时，超时后提示仍可提交但会标记超时；",
    "是否超时由服务端根据 submittedAt 判定，不信任前端时间；",
    "超时提交仍正常评分并计入统计，教师端和 CSV 显示“超时”。",
])

# 10 认证
new_section("10. 教师认证、会话与权限隔离")
add_heading("10.1 认证链路", 2)
add_bullets([
    "教师使用手机号注册和登录，手机号具有唯一约束；",
    "密码至少 8 位且包含字母和数字，使用 scrypt 哈希保存；",
    "登录成功生成随机会话令牌，数据库只保存 SHA-256 哈希；",
    "Cookie 设置 HttpOnly、SameSite=Lax 和有效期，HTTPS 下启用 Secure；",
    "退出时删除会话并清除 Cookie，登录失败进行基础限流。",
])
add_heading("10.2 三层权限控制", 2)
add_table(["层级", "控制方式"], [
    ["教师页面", "未登录重定向到登录页，教师只能查看自己的测验"],
    ["教师 API", "未登录返回 401，编辑、发布、导出等接口验证归属"],
    ["数据查询", "按 teacherId 过滤，非本人数据返回 404"],
], widths=[4, 12])
add_heading("10.3 验证", 2)
add_para("第二名测试教师访问第一名教师的测验、详情页和导出接口均返回 404；学生不带 Cookie 的公开作答页面返回 200。该验证证明权限不是仅靠隐藏导航实现。")

# 11 移动与部署
new_section("11. 学生移动访问与 Ubuntu 部署")
add_heading("11.1 分享地址解析", 2)
add_bullets([
        "优先使用 PUBLIC_BASE_URL，用于 Cloudflare 或正式域名；",
        "否则沿用教师当前访问的非回环地址，并识别 X-Forwarded-Proto；",
        "最后回退到本机第一个局域网 IPv4 地址；",
        "分享链接与二维码使用同一地址，避免把 127.0.0.1 发给手机。",
])
add_heading("11.2 原生部署结构", 2)
add_code("学生手机（4G/5G）\n        ↓ HTTPS\nCloudflare Quick Tunnel\n        ↓\nzhiceyun-tunnel.service\n        ↓\nzhiceyun.service（127.0.0.1:3100）\n        ↓\nMySQL（仅本机访问）")
add_bullets([
        "Node.js 22、pnpm 11、MySQL 8.x，代码位于 /opt/zhiceyun；",
        "应用配置位于 /etc/zhiceyun/zhiceyun.env，避免更新代码覆盖密钥；",
        "现有 new-api 使用 3000 端口，智测云使用 3100，互不影响；",
        "systemd 负责应用与隧道后台运行，Quick Tunnel 地址变化时更新 PUBLIC_BASE_URL。",
])

# 12 第一次关键迭代
new_section("12. 第一次关键迭代：模型字段校验与 Prompt 修复")
add_heading("12.1 问题定位", 2)
add_para("接入真实模型后，页面提示“生成的题目未通过校验，请调整要求后重试”。检查配置文件和 /api/config，确认 API Key、Base URL 和模型名称均已被服务读取，因此问题不在密钥配置。", color=PRIMARY)
add_heading("12.2 修改方案", 2)
add_bullets([
        "使用真实接口复现，得到 HTTP 422 和 stem: expected string, received undefined；",
        "在 Prompt 中补充完整 JSON 模板，明确六个必需字段；",
        "兼容 question、choices、correctAnswer、analysis 等字段别名；",
        "保留题量、题型、答案、选项和总分的严格校验；",
        "校验错误增加题号和字段路径，便于继续定位。",
])
add_heading("12.3 验证结果", 2)
add_code("HTTP 201\n题目数量：6\n题型顺序：单选 → 多选 → 判断 → 填空 → 单选 → 多选\n总分：100\n题干、答案和解析完整性：True")
add_para("随后根据同一知识点集中排列的需求，增加服务端 organizeQuestions，以确定性规则解决题目散落问题。")
add_para("对应提交：f4d5351、682e64a。", bold_prefix="对应提交：")

# 13 第二次关键迭代
new_section("13. 第二次关键迭代：从 JSON 文件到 MySQL 持久化")
add_heading("13.1 问题定位", 2)
add_para("数据库和数据表创建完成后，检查发现应用仍把业务数据写入 data/database.json。由此提出的问题是：“代码修改了吗，现在数据应该需要持久化到数据库里了。”", color=PRIMARY)
add_heading("13.2 修改方案", 2)
add_bullets([
        "保留现有页面和 API，只替换底层存储，避免大范围重写；",
        "使用 Drizzle ORM＋mysql2 建立连接池和表结构映射；",
        "保持 listQuizzes、createQuiz、createSubmission 等原接口；",
        "测验与题目、提交与逐题答案分别使用事务；",
        "通过 DATABASE_URL 配置连接，新增 /api/health 健康检查；",
        "应用层检查与 MySQL 唯一索引共同防止重复学号。",
])
add_heading("13.3 数据库直接验证", 2)
add_table(["验证项", "实际结果"], [
    ["测验", "published，6 道题，总分 100"],
    ["学生提交", "2 份，满分 100、全错 0"],
    ["逐题答案", "12 条，正确 6 条，得分合计 100"],
    ["重复提交", "相同学号第二次提交被拦截"],
    ["工程验证", "17 项测试、类型检查与生产构建通过"],
], widths=[4.5, 11.5])
add_para("对应提交：0b7d7a4、bdf11b3。", bold_prefix="对应提交：")

# 14 第三次关键迭代
new_section("14. 第三次关键迭代：教师登录与权限隔离")
add_heading("14.1 问题定位", 2)
add_para("早期版本没有教师身份认证，知道教师端地址即可查看标准答案和学生成绩，也可以调用 AI 出题。因此提出“现在完成教师登陆的开发”，目标是教师必须登录，学生继续免登录，每名教师只能管理自己的数据。", color=PRIMARY)
add_heading("14.2 修改方案", 2)
add_bullets([
        "首次初始化直接升级本地系统账号，保留已有测验与作答归属；",
        "使用 scrypt 保存密码哈希，MySQL 只保存会话令牌哈希；",
        "实现登录、退出、会话查询、密码强度校验与登录失败限流；",
        "保护教师页面、生成、编辑、发布、统计和导出 API；",
        "所有数据访问按 teacherId 隔离，学生公开作答保持免登录。",
])
add_heading("14.3 权限验证", 2)
add_table(["场景", "结果"], [
    ["未登录访问教师 API", "401"],
    ["未登录访问教师页面", "重定向到登录页"],
    ["第二名教师访问他人测验/导出", "404"],
    ["学生不带 Cookie 作答", "200"],
    ["错误密码", "统一提示并记录失败次数"],
], widths=[8.2, 7.8])
add_para("后续根据使用反馈，又完成手机号登录、8 位密码和始终显示注册入口等迭代。对应提交：d699a73、2d271d8、6e91786、8749514。")

# 15 复现
new_section("15. 可复现性声明与 10 分钟重现指南")
add_heading("15.1 环境清单", 2)
add_table(["组件", "版本或要求"], [
    ["Node.js", "推荐 22.x，最低 20.9"],
    ["pnpm", "推荐 11.x"],
    ["MySQL", "8.x，数据库名 zhiceyun"],
    ["模型接口", "OpenAI 兼容 /chat/completions"],
    ["部署可选", "Ubuntu＋systemd 或 Docker Compose"],
], widths=[4.5, 11.5])
add_heading("15.2 复现步骤", 2)
add_code("git clone https://github.com/yufeixin1017/zhiceyun.git\ncd zhiceyun\npnpm install --frozen-lockfile\n\nfor file in database/migrations/00*.sql; do\n  mysql -u root -p < \"$file\" || break\ndone\n\ncp .env.example .env.local\n# 填写 AI_API_KEY、AI_BASE_URL、AI_MODEL、DATABASE_URL\npnpm test && pnpm typecheck && pnpm build && pnpm start")
add_para("启动后打开 http://localhost:3000/setup 创建教师账号，再创建并发布真实课堂测验。未配置模型时系统明确禁止生成，不使用预置题目冒充模型输出。")
add_heading("15.3 可复现性论证", 2)
add_bullets([
        "pnpm-lock.yaml 锁定依赖，SQL 文件固定表结构并记录迁移版本；",
        "环境变量模板公开，真实密钥不进入仓库；",
        "测试固定数据与模型调用分离，保证评分、权限和统计可重复验证；",
        "README 同时提供 Mac、本地终端和 Ubuntu 生产部署路径。",
])

# 16 验证
new_section("16. 测试与真实验证结果")
add_heading("16.1 自动化验证", 2)
add_table(["验证类型", "覆盖内容", "结果"], [
    ["单元测试", "评分、字段兼容、排序、权限、手机号、限时、分享地址、北京时间等", "35 项全部通过"],
    ["类型检查", "TypeScript 严格检查", "通过"],
    ["生产构建", "Next.js 全部页面与 API", "通过"],
    ["冒烟测试", "教师认证、创建发布、满分/零分、重复提交、导出", "全链路通过"],
], widths=[3.1, 9.3, 3.6])
add_heading("16.2 真实场景验证", 2)
add_bullets([
        "真实模型生成 6 道题，题型顺序正确、总分 100、答案解析完整；",
        "MySQL 中实际存在 6 道题、2 份提交、12 条逐题答案；",
        "第二名教师访问他人数据返回 404，学生公开作答返回 200；",
        "超时提交 isLate=true，得分照常计算，教师统计和 CSV 仍包含记录；",
        "通过局域网地址打开学生页面，PUBLIC_BASE_URL 可正确切换为公网地址；",
        "standalone 入口和静态资源可访问，原 next start 方式不受影响。",
])
add_para("这些验证分别对应模型质量、数据一致性、权限、时间规则、部署和复现性，而不是仅凭页面截图判断完成度。", color=MUTED)

# 17 原创与总结
new_section("17. 原创性、局限与总结")
add_heading("17.1 原创性与真实演进", 2)
add_para("项目从空工作区开始，围绕真实课堂需求逐步形成。每次提交对应一次需求确认、功能落地或 Bug 修复；AI 负责代码建议与修改，开发者持续进行范围收敛、真实接口验证和部署验收。Git 历史、开发会话、测试和数据库记录可以相互印证，不是将已有开源项目包装后提交。")
add_heading("17.2 当前局限", 2)
add_bullets([
        "仅支持客观题与简短填空，不处理主观题和数学过程；",
        "学生姓名学号为自我声明，不用于正式身份认证；",
        "暂未实现学校统一身份认证和教师管理后台；",
        "Cloudflare Quick Tunnel 地址可能变化，长期运行应使用命名隧道和固定域名。",
])
add_heading("17.3 总结", 2)
add_para("智测云的价值不只是“AI 能出题”，而是把模型输出纳入可控工程流程：用 Prompt 表达教学意图，用 Schema 约束结构，用教师审核保证内容质量，用 MySQL 和事务保存真实作答，用服务端评分与统计形成课堂闭环，再用真实对话、Git 演进和测试证明开发过程可信、可复现。")
add_para("仓库：https://github.com/yufeixin1017/zhiceyun", bold_prefix="仓库：")
add_para("公网演示地址：https://luis-gratuit-validation-iii.trycloudflare.com。测试教师手机号为 16666666666，密码为 qwer@1234，仅供评审使用。", bold_prefix="公网演示地址：")

# 保存
for paragraph in doc.paragraphs:
    for run in paragraph.runs:
        if not run.font.name:
            set_run_font(run)

doc.core_properties.title = "智测云——AI 随堂测验生成与自动评阅平台技术文档"
doc.core_properties.subject = "2026 第九届传智杯 AI 创新应用挑战赛"
doc.core_properties.author = "智测云项目组"
doc.core_properties.keywords = "Vibe Coding, Next.js, MySQL, AI 出题, 自动评阅, 可复现"
doc.save(DOCX_PATH)
print(DOCX_PATH)
