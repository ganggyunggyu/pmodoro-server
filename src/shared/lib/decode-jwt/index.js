"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsTokenExpired = exports.decodeJwt = void 0;
const decodeJwt = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(''));
    const result = JSON.parse(jsonPayload);
    const kakaoId = result.aud + result.sub;
    const profileImg = result.picture;
    const userInfo = Object.assign(Object.assign({ kakaoId }, result), { profileImg });
    return userInfo;
};
exports.decodeJwt = decodeJwt;
const getIsTokenExpired = (id_token) => {
    const { exp } = (0, exports.decodeJwt)(id_token);
    return Date.now() >= exp * 1000;
};
exports.getIsTokenExpired = getIsTokenExpired;
