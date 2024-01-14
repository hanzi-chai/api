import { Router } from 'itty-router';
import * as repertoire from '../controller/repertoire';
import { authorizedAdmin, authorizedUser } from '../middleware/jwt';

export const routerRepertoire = Router({ base: '/repertoire' })
	.get('/', repertoire.List)
	.get('/all', repertoire.ListAll)
	.get('/:unicode', repertoire.validateUnicode, repertoire.Info)
	.post('/', authorizedUser, authorizedAdmin, repertoire.CreatePUA)
	.post('/batch', authorizedUser, authorizedAdmin, repertoire.CreateBatch)
	.post('/:unicode', authorizedUser, authorizedAdmin, repertoire.validateUnicode, repertoire.checkNotExist, repertoire.Create)
	.put('/:unicode', authorizedUser, authorizedAdmin, repertoire.validateUnicode, repertoire.checkExist, repertoire.Update)
	.put('/', authorizedUser, authorizedAdmin, repertoire.Mutate)
	.delete('/:unicode', authorizedUser, authorizedAdmin, repertoire.validateUnicode, repertoire.Delete);
