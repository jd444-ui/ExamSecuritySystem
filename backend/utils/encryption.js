const CryptoJS =
require("crypto-js");

const SECRET =
"ExamSecurityKey";

function encrypt(text){

    return CryptoJS
    .AES
    .encrypt(
        text,
        SECRET
    )
    .toString();

}

module.exports = {
encrypt
};