本文件夹中的脚本用于从 IDS 数据库生成 chai 数据库。

要运行这些脚本，请在 Node.js 环境中安装 [`tsx`](https://www.npmjs.com/package/tsx) 这个解释器，然后在项目根目录下运行 `tsx scirpts/<name>.ts`。

- `download.ts`：下载当前的 chai 数据库以及 Babelstone 提供的 IDS 到 `data` 目录；
- `ids.ts`：主程序；
- `pua.txt`：IDS 中 CJK-B 及以上的部件映射到 chai PUA；
- `patch.txt`：对 IDS 中存在嵌套的情况（一条记录包括了多个结构描述符）及其他不合理的地方进行纠正；

运行 `ids.ts`，在命令行输出需要生成的数据条目数以及成功生成的数量，如

```
Total: 19097, Success: 17790
```

并产生三个文件：

- `data/bad-ids.txt`：不符合规范的拆分；
- `data/extra-chars.txt`：没被转换为 PUA 的超集字符；
- `data/new-repertoire.json`：实际生成的数据库文件；

目前需要完成的工作：

1. 编写 `pua.txt`，把目前在 chai 中的 PUA 对应起来；
2. 编写 `patch.txt`，把 IDS 中嵌套的情况消除；
