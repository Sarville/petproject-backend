import { All, Controller, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ArtsearchService } from './artsearch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('artsearch')
@UseGuards(JwtAuthGuard)
export class ArtsearchController {
  constructor(private readonly artsearchService: ArtsearchService) {}

  @All('*path')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path.replace(/^\/artsearch\/?/, '');
    try {
      const data = await this.artsearchService.forward(
        path,
        req.method,
        req.query as Record<string, string>,
        req.body,
      );
      res.json(data);
    } catch (err: any) {
      const status = err.status ?? 418;
      res.status(status).json({ error: err.message });
    }
  }
}
