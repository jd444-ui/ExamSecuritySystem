const CryptoJS =
require("crypto-js");

function generateHash(data){

    return CryptoJS
    .SHA256(data)
    .toString();

}

module.exports =
generateHash;