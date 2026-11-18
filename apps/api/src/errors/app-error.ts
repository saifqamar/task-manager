import type { ErrorCode } from '@app/shared';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class TaskNotFoundError extends AppError {
  constructor(id: string) {
    super(404, 'TASK_NOT_FOUND', `Task ${id} not found`);
  }
}

export class CityNotFoundError extends AppError {
  constructor(city: string) {
    super(404, 'CITY_NOT_FOUND', `City "${city}" not found`);
  }
}

export class UpstreamError extends AppError {
  constructor(message = 'Weather service is unavailable') {
    super(502, 'UPSTREAM_ERROR', message);
  }
}
