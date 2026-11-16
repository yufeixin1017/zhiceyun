from pathlib import Path
from PIL import Image
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path('/Users/xinyanbin/Documents/传智杯')
OUT = ROOT / '提交材料'
IMAGES = OUT / 'images'
OUT.mkdir(exist_ok=True)


def crop(name, target, height):
    image = Image.open(IMAGES / name)
    image.crop((0, 0, image.width, min(height, image.height))).save(IMAGES / target)

crop('create-quiz.png', 'create-quiz-view.png', 1109)
crop('student-quiz.png', 'student-quiz-view.png', 1450)
crop('teacher-stats.png', 'teacher-stats-view.png', 1550)

PRIMARY = '4C51C6'
DARK = '202A44'
MUTED = '64748B'
FONT = 'PingFang SC'

def set_run(run, size=10.5, bold=None, color=DARK, name=FONT):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), name)
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def page_field(paragraph, field):
    run = paragraph.add_run()
    begin = OxmlElement('w:fldChar'); begin.set(qn('w:fldCharType'), 'begin')
    text = OxmlElement('w:instrText'); text.set(qn('xml:space'), 'preserve'); text.text = field
    end = OxmlElement('w:fldChar'); end.set(qn('w:fldCharType'), 'end')
    run._r.extend([begin, text, end])
    set_run(run, size=8, color=MUTED)


doc = Document()
section = doc.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(1.8)
section.bottom_margin = Cm(1.7)
section.left_margin = Cm(1.85)
section.right_margin = Cm(1.85)

normal = doc.styles['Normal']
normal.font.name = FONT
normal._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor.from_string(DARK)
normal.paragraph_format.line_spacing = 1.3
normal.paragraph_format.space_after = Pt(6)
for name, size, color in [('Heading 1', 18, PRIMARY), ('Heading 2', 13, DARK), ('Heading 3', 11, PRIMARY)]:
    style = doc.styles[name]
    style.font.name = FONT
    style._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(color)
    style.paragraph_format.space_before = Pt(8)
    style.paragraph_format.space_after = Pt(8)
    style.paragraph_format.keep_with_next = True

header = section.header.paragraphs[0]
header.text = '智测云 · 作品介绍文档'
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
for run in header.runs:
    set_run(run, size=8, color=MUTED)
footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = footer.add_run('第 '); set_run(run, size=8, color=MUTED)
page_field(footer, 'PAGE')
run = footer.add_run(' 页'); set_run(run, size=8, color=MUTED)


def heading(text, level=1):
    return doc.add_heading(text, level=level)


def para(text, color=DARK, size=10.5, bold=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run(run, size=size, color=color, bold=bold)
    return p


def bullets(items):
    for item in items:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(item)
        set_run(run, size=10.2)


def table(headers, rows, widths=(4, 12)):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'
    t.autofit = False
    for i, text in enumerate(headers):
        cell = t.rows[0].cells[i]
        cell.text = text
        cell.width = Cm(widths[i])
        shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), PRIMARY)
        cell._tc.get_or_add_tcPr().append(shd)
        for run in cell.paragraphs[0].runs:
            set_run(run, size=9, bold=True, color='FFFFFF')
    for values in rows:
        cells = t.add_row().cells
        for i, value in enumerate(values):
            cells[i].text = str(value)
            cells[i].width = Cm(widths[i])
            for run in cells[i].paragraphs[0].runs:
                set_run(run, size=9)
    doc.add_paragraph()
    return t


def picture(filename, width_cm, caption):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(IMAGES / filename), width=Cm(width_cm))
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(caption)
    set_run(run, size=9, color=MUTED)


def page(title, subtitle=None):
    doc.add_page_break()
    heading(title)
    if subtitle:
        para(subtitle, color=MUTED, size=10)


# 封面
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(80)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('智测云')
set_run(run, size=34, bold=True, color=PRIMARY)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('面向高校课堂的 AI 随堂测验生成与自动评阅平台')
set_run(run, size=16, bold=True)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('作 品 介 绍 文 档')
set_run(run, size=20, bold=True, color=PRIMARY)
for _ in range(4):
    doc.add_paragraph()
para('2026 第九届传智杯全国大学生数智创新与 AI 应用大赛\nAI 创新应用挑战赛 · 方向四：低代码与智能表单生成引擎', color=MUTED, size=11).alignment = WD_ALIGN_PARAGRAPH.CENTER
for _ in range(4):
    doc.add_paragraph()
table(['项目', '内容'], [
    ['项目名称', '智测云——AI 随堂测验生成与自动评阅平台'],
    ['作品形态', 'Next.js 全栈应用＋MySQL＋公网移动作答'],
    ['代码仓库', 'https://github.com/yufeixin1017/zhiceyun'],
    ['公网演示', 'https://luis-gratuit-validation-iii.trycloudflare.com'],
    ['文档日期', '2026 年 11 月'],
], widths=(3.2, 12.8))

# 1 项目详情及使用方式
page('1. 项目详情及使用方式')
heading('1.1 项目定位', 2)
para('智测云面向高校课堂的随堂知识回顾与形成性检测。教师输入课程主题和课堂讲义，系统通过大模型生成结构化客观题，教师审核后发布，学生通过链接或二维码在线作答，服务端自动评分并生成个人解析、班级统计和题目分布。项目重点解决临时出题耗时、收卷统计繁琐以及学生答题入口不统一的问题。')
heading('1.2 完整使用流程', 2)
table(['步骤', '教师操作', '学生操作'], [
    ['1. 创建', '填写课程名称、课堂主题、讲义要点，选择题量、题型、难度和答题限时', ''],
    ['2. 生成与审核', 'AI 生成题目，教师修改题干、选项、答案、解析和知识点', ''],
    ['3. 发布', '确认总分与答案，发布链接或二维码', '手机打开链接或扫码'],
    ['4. 作答', '查看发布状态和提交情况', '填写姓名、学号，完成选择、判断和填空题并提交'],
    ['5. 评阅', '查看成绩、逐题正确率、学生名单、答案分布和 CSV', '查看个人成绩、正确答案和解析'],
], widths=(2.2, 8.1, 5.7))
heading('1.3 演示入口', 2)
para('公网地址：https://luis-gratuit-validation-iii.trycloudflare.com')
para('测试教师账号：手机号 16666666666，密码 qwer@1234，仅用于本次比赛评审体验。')
para('系统已准备数据结构、操作系统、计算机网络三门专业课测验，每门课均包含 6 道题和 5 份虚拟学生作答，便于直接查看统计与逐题分析。')

# 2 亮点
page('2. 项目亮点')
heading('2.1 从自然语言到可用测验', 2)
para('系统不是简单生成一段题目文本，而是将课堂内容转换为统一的 Assessment Schema，再渲染成可编辑、可发布、可作答和可评分的表单。题目、选项、答案、解析和知识点均可独立校验与保存。')
heading('2.2 教师可控的 AI 协同', 2)
bullets([
    'Prompt 明确字段结构、题型、题量和知识点要求，模型只负责生成初稿；',
    '教师可以修改任意题目、答案和解析，审核通过后才能发布；',
    '同一知识点集中排列，组内按单选、多选、判断、填空排序；',
    '模型字段不统一时自动归一化，异常输出不会直接写入数据库。',
])
heading('2.3 完整的数据分析闭环', 2)
bullets([
    '学生可查看个人成绩、逐题对错、标准答案和解析；',
    '教师既可按学生查看逐题作答，也可按题目查看选项分布、完整答案组合和学生名单；',
    '支持超时标记、正确率、平均分、最高分、及格率和 CSV 导出。',
])
heading('2.4 手机可用、部署可复现', 2)
bullets([
    '分享链接与二维码使用同一可访问地址，学生使用 4G/5G 也能作答；',
    'MySQL 事务化保存，教师、题目、提交和逐题答案均可追溯；',
    '提供数据库迁移、环境模板、单元测试、冒烟测试和 Ubuntu 部署文档。',
])

# 3 AI 落地
page('3. AI 测试技术落地使用情况概述')
heading('3.1 真实接口生成', 2)
para('项目使用 OpenAI 兼容的大模型接口生成客观题。真实调用流程为：课堂内容 → Prompt 约束 → 模型返回 JSON → 字段归一化 → Zod 业务校验 → 服务端分配 ID 和分值 → 教师审核发布。未配置模型时系统明确禁止生成，不使用预置题目冒充 AI 输出。')
heading('3.2 典型落地问题与处理', 2)
table(['实际问题', '处理方案', '验证结果'], [
    ['模型使用 question 等别名，stem 校验失败', '补充 JSON 模板并兼容常见字段名', '真实接口返回 201，6 题共 100 分'],
    ['模型输出的知识点和题型顺序不稳定', '服务端按知识点分组，再按固定题型顺序整理', '同知识点相邻，组内顺序固定'],
    ['不同模型返回 JSON 外层结构存在差异', '提取 JSON、兼容 choices/correctAnswer/analysis 等字段', '统一进入 Assessment Schema 和评分流程'],
], widths=(4.7, 6.2, 5.1))
heading('3.3 AI 协同开发的实际作用', 2)
para('项目开发过程中，AI 被用于 Schema 设计、代码生成、字段兼容、Bug 排查、数据库迁移、认证和测试。每次关键修改都保留真实报错、修改过程和验证结果，能够与 Git 提交和原始会话记录对应，而不是只调用模型生成界面。')

# 4 关键技术
page('4. 项目涉及的关键技术')
table(['技术方向', '具体实现'], [
    ['全栈框架', 'Next.js App Router、React、TypeScript，页面与 Route Handlers 统一实现'],
    ['结构化校验', 'Zod 约束教师输入和模型输出，统一 Assessment Schema'],
    ['数据持久化', 'MySQL 8＋Drizzle ORM＋mysql2 连接池，事务写入与联合唯一索引'],
    ['自动评分', '服务端比较答案，支持多选全对、填空等价答案、未作答和超时标记'],
    ['认证与权限', 'scrypt 密码哈希、MySQL 会话哈希、HttpOnly Cookie、teacherId 数据隔离'],
    ['限时控制', '发布时间加答题限时计算截止时间，提交时由服务端判定 isLate'],
    ['移动访问', '二维码生成、分享地址解析、Cloudflare Tunnel 和 HTTPS'],
    ['质量保障', '35 项单元测试、TypeScript 检查、生产构建、确定性冒烟测试'],
], widths=(3.7, 12.3))
heading('4.1 数据一致性设计', 2)
para('测验与全部题目在同一事务中写入；学生提交与全部逐题答案在另一事务中写入。数据库唯一索引同时约束题目顺序、学号重复提交和逐题答案唯一性，避免业务数据出现不完整状态。')

# 5 架构图
page('5. 项目相关图片：系统架构与业务闭环')
picture('architecture.png', 16.2, '图 1：Next.js、模型接口、MySQL 与移动作答之间的业务关系')

# 6 创建页
page('6. 项目相关图片：教师创建随堂测验')
picture('create-quiz-view.png', 16.2, '图 2：教师输入课程、主题、课堂内容并配置题量、题型、难度和限时')
para('教师创建页只保留实际需要的输入项，课堂内容由教师自行填写，不预置示例课程。模型生成后仍需进入审核编辑流程。', color=MUTED, size=9)

# 7 学生作答
page('7. 项目相关图片：学生在线作答')
picture('student-quiz-view.png', 14.2, '图 3：学生通过公网链接或二维码进入作答页面')
para('学生填写姓名和学号后即可作答，提交前页面不会收到标准答案。提交后由服务端评分，并展示成绩、正确答案和逐题解析。', color=MUTED, size=9)

# 8 统计
page('8. 项目相关图片：教师统计与题目分布')
picture('teacher-stats-view.png', 15.2, '图 4：教师查看平均分、最高分、及格率、逐题正确率和知识点反馈')
para('统计页还可以继续展开题目，查看每个选项的选择人数、答案组合和对应学生名单，并进入单个学生的逐题详情。', color=MUTED, size=9)

# 9 登录与权限
page('9. 项目相关图片：教师登录与权限控制')
picture('login.png', 15.5, '图 5：教师手机号登录入口')
para('教师端使用手机号和密码登录，密码和会话令牌均以哈希形式保存。学生端不需要登录，教师管理接口与学生公开作答接口相互独立。', color=MUTED, size=9)

# 10 发表与优化
page('10. 项目发表、获奖与优化说明')
heading('10.1 是否发表过或获奖', 2)
para('截至本文档整理时，本项目未发表过论文，也未获得过比赛奖项或其他荣誉。本次提交仅作为 2026 第九届传智杯全国大学生数智创新与 AI 应用大赛的参赛作品。')
heading('10.2 是否基于其他项目优化', 2)
para('本项目从空工作区开始开发，不是基于其他开源项目或已有产品的二次开发，因此没有基于原项目的功能优化说明。项目后续增加的 MySQL 持久化、教师认证、题目分析、限时、移动访问和部署配置，均属于本项目自身的功能迭代。')
heading('10.3 原创过程说明', 2)
para('项目经历了需求确认、结构化 Schema 设计、真实模型接入、数据库迁移、教师权限、移动访问和服务器部署等阶段。每次迭代均形成独立提交，并保留原始对话、代码修改、测试和实际验证结果。')
heading('10.4 项目访问', 2)
para('代码仓库：https://github.com/yufeixin1017/zhiceyun')
para('公网演示：https://luis-gratuit-validation-iii.trycloudflare.com')

doc.core_properties.title = '智测云作品介绍文档'
doc.core_properties.subject = '项目详情、亮点、AI 落地、关键技术、图片、发表与优化说明'
doc.core_properties.author = '智测云项目组'
doc.save(OUT / '智测云-作品介绍文档.docx')
print(OUT / '智测云-作品介绍文档.docx')
