import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { QuotasService } from '../quotas/quotas.service';

@Injectable()
export class ArtsearchService {
  private readonly baseUrl = 'https://api.artsearch.io';

  constructor(
    private readonly httpService: HttpService,
    private readonly quotasService: QuotasService,
  ) {}

  async forward(path: string, method: string, params: Record<string, string>, body: any) {
    const url = `${this.baseUrl}/${path}`;
    const apiKey = process.env.ARTSEARCH_API_KEY ?? '';

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          params,
          data: body,
          headers: { 'x-api-key': apiKey },
        }),
      );

      const quotaHeader = response.headers['x-api-quota-left'];
      if (quotaHeader !== undefined) {
        this.quotasService.update('artsearch', Number(quotaHeader));
      }

      return response.data;
    } catch (err: any) {
      this.quotasService.update('artsearch', 0);
      const data = err?.response?.data;
      const message = (typeof data === 'string' ? data : data?.message ?? data?.error) ?? 'Upstream error';
      throw new HttpException(message, HttpStatus.I_AM_A_TEAPOT);
    }
  }
}
