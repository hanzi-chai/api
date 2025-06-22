本文件夹中的脚本用于从 IDS 数据库生成自动拆分数据库。

要运行这些脚本，请在 Node.js 环境中安装 [`tsx`](https://www.npmjs.com/package/tsx) 这个解释器，然后在项目根目录下运行 `tsx scirpts/<name>.ts`。

- `download.ts`：下载当前的 chai 数据库以及 Babelstone 提供的 IDS 到 `data` 目录；
- `process.ts`：主程序；

运行 `process.ts` 生成 `data/repertoire.new.json`。
