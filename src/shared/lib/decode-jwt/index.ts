export const decodeJwt = (token: string) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
      .join(''),
  );

  const result = JSON.parse(jsonPayload);

  const userId = result.aud + result.sub;

  const userInfo = {
    userId: userId,
    ...result,
  };

  return userInfo;
};

export const getIsTokenExpired = (id_token: string) => {
  const { exp } = decodeJwt(id_token);
  return Date.now() >= exp * 1000;
};
