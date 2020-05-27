import { Params, ParamsDictionary, Request, NextFunction } from 'express-serve-static-core'
import { JoeResponse } from '../types'

export interface AsyncRequestHandler<P extends Params = ParamsDictionary, ResBody = any, ReqBody = any> {
    (req: Request<P, ResBody, ReqBody>, res: JoeResponse<ResBody>, next?: NextFunction): Promise<any>;
}

export const wrap = (handler: AsyncRequestHandler) => (req: any, res: any, next: any) => handler(req, res, next).catch(next)