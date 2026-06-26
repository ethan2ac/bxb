import { success } from '../_shared/response';
import { sessionCookie } from '../_shared/crypto';

export const onRequestPost: PagesFunction = async () => {
  const response = success({ message: 'Logged out' });
  response.headers.set('Set-Cookie', sessionCookie('', 0));
  return response;
};
