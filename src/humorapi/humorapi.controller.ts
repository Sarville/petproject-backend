import { All, Controller, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { HumorapiService } from './humorapi.service';

@Controller('humorapi')
export class HumorapiController {
  constructor(private readonly humorapiService: HumorapiService) {}

  @All('*path')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path.replace(/^\/humorapi\/?/, '');
    try {
      const data = await this.humorapiService.forward(
        path,
        req.query as Record<string, string>,
      );
      res.json(data);
    } catch (err: any) {
      const status = err.status ?? 418;
      res.status(status).json({ error: err.message });
    }
  }
}
