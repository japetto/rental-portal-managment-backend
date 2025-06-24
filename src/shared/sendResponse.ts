import { Response } from "express";

type IResponseType<T> = {
  success: boolean;
  statusCode: number;
  message?: string | null;
  data: T;
};

const sendResponse = <T>(res: Response, data: IResponseType<T>): void => {
  res.status(data.statusCode).send({
    success: true,
    statusCode: data.statusCode,
    message: data.message,
    data: data.data || null,
  });
};

export default sendResponse;
