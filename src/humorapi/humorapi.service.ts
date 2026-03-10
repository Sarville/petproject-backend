import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { QuotasService } from '../quotas/quotas.service';

@Injectable()
export class HumorapiService {
  private readonly baseUrl = 'https://api.humorapi.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly quotasService: QuotasService,
  ) {}

  async forward(path: string, params: Record<string, string>) {
    const url = `${this.baseUrl}/${path}`;
    const apiKey = process.env.HUMORAPI_KEY ?? '';

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'GET',
          url,
          params,
          headers: { 'x-api-key': apiKey },
        }),
      );

      const quotaHeader = response.headers['x-api-quota-left'];
      if (quotaHeader !== undefined) {
        this.quotasService.update('humorapi', Number(quotaHeader));
      }

      return response.data;
    } catch (err: any) {
      this.quotasService.update('humorapi', 0);
      const data = err?.response?.data;
      const message = (typeof data === 'string' ? data : data?.message ?? data?.error) ?? 'Upstream error';
      throw new HttpException(message, HttpStatus.I_AM_A_TEAPOT);
    }
  }
}
