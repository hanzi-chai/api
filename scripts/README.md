本文件夹中的脚本用于从天码 IDS 数据库更新汉字自动拆分数据库。当天码 IDS 数据库因 Unicode 更新而发生变化时，只需要重新运行该脚本，即可生成需要添加到数据库中的条目，而原有条目保持不变。

要运行这些脚本，请在 Node.js 环境中安装 [`tsx`](https://www.npmjs.com/package/tsx) 这个解释器，然后在项目根目录下运行 `tsx scirpts/<name>.ts`。

- `download.ts`：下载当前的汉字自动拆分系统数据库到 `data` 目录；
- `process.ts`：主程序；

其他：

- `ids.ts`：IDS 解析工具；
- `utils.ts`：提供了和汉字自动拆分系统 API 交互的工具函数。

运行 `process.ts` 生成 `data/repertoire.new.json`。
