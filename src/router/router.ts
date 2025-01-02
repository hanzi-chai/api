import { Router } from 'itty-router';
import { routerUsers } from './users';
import { routerRepertoire } from './repertoire';
import { Login } from '../controller/users';
import { routerEquivalence } from './equivalence';

/** 主路由, 以 `/api` 为前缀 */
export const routerApi = Router()
	// 登录接口
	.post('/login', Login)
	// 用户子路由
	.all('/users/*', routerUsers.handle)
	// 汉字信息子路由
	.all('/repertoire/*', routerRepertoire.handle)
	// 当量子路由
	.all('/equivalence/*', routerEquivalence.handle);
