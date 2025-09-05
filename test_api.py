import requests
import json

# 测试API端点
url = 'http://localhost:1198/api/validate/unified/generation/format'
data = {'projectName': '猛鬼世界'}

print(f'发送的数据: {data}')
print(f'JSON编码: {json.dumps(data, ensure_ascii=False)}')

try:
    response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
    print(f'响应状态码: {response.status_code}')
    print(f'响应内容: {response.text}')
    
    if response.status_code == 200:
        result = response.json()
        print(f'解析后的响应: {result}')
except Exception as e:
    print(f'请求失败: {e}')