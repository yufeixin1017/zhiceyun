from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path('/Users/xinyanbin/Documents/传智杯/提交材料/images')
OUT.mkdir(parents=True, exist_ok=True)
FONT = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'

def font(size, bold=False):
    return ImageFont.truetype(FONT, size)

img = Image.new('RGB', (1800, 1000), '#F7F8FC')
draw = ImageDraw.Draw(img)
draw.text((90, 55), '智测云系统架构与业务闭环', font=font(46), fill='#202A44')

boxes = {
    'teacher': (100, 220, 470, 400),
    'student': (100, 610, 470, 790),
    'app': (690, 330, 1110, 570),
    'ai': (1280, 170, 1690, 350),
    'db': (1280, 610, 1690, 790),
}
labels = {
    'teacher': ('教师端', '创建 / 审核 / 发布 / 统计'),
    'student': ('学生端', '手机扫码作答 / 查看解析'),
    'app': ('Next.js 应用服务', 'Prompt 约束 · Schema 校验\n评分与统计 · 权限控制'),
    'ai': ('大模型接口', '生成结构化客观题'),
    'db': ('MySQL', '教师 · 测验 · 题目\n提交 · 逐题答案'),
}
colors = {'teacher':'#E8E9FF','student':'#E5F7F3','app':'#EEF0FF','ai':'#FFF3E4','db':'#E8F0FF'}
for key, (x1,y1,x2,y2) in boxes.items():
    draw.rounded_rectangle((x1,y1,x2,y2), radius=24, fill=colors[key], outline='#B8BDE8', width=3)
    title, desc = labels[key]
    draw.text((x1+28,y1+28), title, font=font(32), fill='#3D45A0')
    draw.multiline_text((x1+28,y1+82), desc, font=font(24), fill='#4B556B', spacing=12)

def arrow(start, end, color='#6970D0', width=5):
    draw.line([start,end], fill=color, width=width)
    x,y=end
    draw.polygon([(x-14,y-10),(x,y),(x-14,y+10)], fill=color)

arrow((470,310),(690,430))
arrow((470,700),(690,500))
arrow((1110,420),(1280,260))
arrow((1110,490),(1280,700))
draw.text((500,290),'课堂内容',font=font(22),fill='#64748B')
draw.text((520,635),'作答数据',font=font(22),fill='#64748B')
draw.text((1130,255),'Prompt / JSON',font=font(22),fill='#64748B')
draw.text((1130,600),'事务写入',font=font(22),fill='#64748B')
draw.text((100,880),'教师审核保证内容质量，服务端评分保证评价一致，MySQL 保证数据持久化',font=font(28),fill='#4B556B')
img.save(OUT/'architecture.png')
print(OUT/'architecture.png')
