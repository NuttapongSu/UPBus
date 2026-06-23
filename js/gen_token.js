const crypto = require('crypto');

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB8uWdtNOv9wjGz1zYj5f7s
4Vh5dU+ixaWgzyu4TQGEY2HHGuRXS+EPolCk+yZqPuAwUN2U6BlDpyen6Z6ZT+IW
rG0+7LhzGdPQX762CiV3rYm0W17pwdoQFldMJDAQ3YJXcaOEmhknRl12xWbD6Uwy
O+03RrV3CD82cK6zmk9xJxWtmhw3OhTqZ5wOmh/Zv3auhgx+rc1iR+cHxqN2FMcK
cx0+BHNR+4hfM8JrTD215B1/ScMDVA7Ol7QcyTgrQQ4i/OoLBIV9WqFEipgKiipC
j//ZwqN+LOITUsJYi+Ee8FjkuZP0lTlYoKToAd8Sz8viddVhMJoEhRcaK0eLGjfV
AgMBAAE=
-----END PUBLIC KEY-----`;

const message = 'PHAYAO01';

const encryptedBuffer = crypto.publicEncrypt(
  {
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha1",
  },
  Buffer.from(message)
);

const token = encryptedBuffer.toString('base64');

console.log("Token ของคุณคือ:");
console.log(token);