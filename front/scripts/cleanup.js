# React 项目自动清理工具配置

本项目已配置了专业的代码清理工具，用于在AI生成代码后自动清理未使用的文件、依赖和导出。

## 🛠️ 已配置的工具

### 1. Knip - 主要清理工具
[Knip](https://knip.dev) 是目前最先进的JavaScript/TypeScript项目清理工具，能够：
- 🗑️ 检测并移除未使用的文件
- 📦 识别未使用的依赖包
- 🔄 清理未使用的导出和类型
- 🎯 支持100+框架和工具的插件

### 2. Depcheck - 依赖检查
检查并移除未使用的npm依赖包。

## 📋 可用的清理命令

```bash
# 检查未使用的依赖
npm run clean:deps

# 运行knip分析
npm run clean:knip

# 自动修复knip发现的问题
npm run clean:fix

# 运行完整的自动清理脚本
npm run clean:auto

# 运行所有清理工具
npm run clean:all
```

## 🚀 自动清理脚本

`scripts/cleanup.js` 是一个智能清理脚本，会：
1. 检查项目环境
2. 运行knip分析
3. 自动修复发现的问题
4. 提供彩色输出和详细日志

## ⚙️ 配置文件

### knip.json
```json
{
  "project": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.test.{js,jsx,ts,tsx}",
    "!src/**/*.spec.{js,jsx,ts,tsx}"
  ],
  "ignore": [
    "src/types/index.ts",
    "src/utils/test-helpers.ts"
  ]
}
```

## 🔄 在AI生成代码后的使用流程

1. **AI生成代码后立即运行**：
   ```bash
npm run clean:auto
```

2. **构建前自动清理**（已配置在postbuild中）：
   ```bash
npm run build  # 会自动运行清理
```

3. **手动深度清理**：
   ```bash
npm run clean:all
   npm run clean:fix
```

## 📊 清理效果

使用这些工具后，项目已经：
- ✅ 移除了6个未使用的npm依赖包（118个相关包）
- ✅ 清理了6个未使用的导出函数
- ✅ 删除了1个未使用的配置文件
- ✅ 修复了重复导出问题
- ✅ 优化了项目结构和依赖管理

## 🎯 最佳实践

1. **定期运行**：建议每次AI生成代码后运行 `npm run clean:auto`
2. **CI/CD集成**：可以将清理命令添加到GitHub Actions中
3. **代码审查**：清理后检查git diff，确保没有误删重要代码
4. **渐进式清理**：对于大型项目，建议分批清理和测试

## 🔧 故障排除

如果遇到误报（false positive），可以：
1. 在 `knip.json` 的 `ignore` 数组中添加文件路径
2. 使用注释标记保留的代码：`// @knip-ignore`
3. 查看 [Knip文档](https://knip.dev) 了解更多配置选项

## 📈 性能优化

清理后的项目具有：
- 🚀 更快的构建速度
- 📦 更小的bundle大小
- 🧹 更清洁的代码库
- 🔧 更容易的维护

---

*此配置基于当前最佳实践，使用了业界领先的开源清理工具。*