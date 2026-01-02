import app from '@constructive-io/knative-job-fn';
import type { Request, Response, NextFunction } from 'express';

app.post('/', async (req: Request, res: Response, next: NextFunction) => {
  if (req.body.throw) {
    next(new Error('THROWN_ERROR'));
  } else {
    res.status(200).json({
      fn: 'example-fn',
      message: 'hi I did a lot of work',
      body: req.body
    });
  }
});

const port = Number(process.env.PORT) || 10101;
app.listen(port);
