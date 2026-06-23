// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExamPaperSecurity {
    struct ExamPaper {
        uint256 id;
        string fileName;
        string paperHash;
        address uploadedBy;
        uint256 timestamp;
        bool exists;
    }

    uint256 public paperCount;

    mapping(uint256 => ExamPaper) public papers;

    event PaperStored(
        uint256 id,
        string fileName,
        string paperHash,
        address uploadedBy,
        uint256 timestamp
    );

    function storePaper(
        string memory _fileName,
        string memory _paperHash
    ) public {
        paperCount++;

        papers[paperCount] = ExamPaper(
            paperCount,
            _fileName,
            _paperHash,
            msg.sender,
            block.timestamp,
            true
        );

        emit PaperStored(
            paperCount,
            _fileName,
            _paperHash,
            msg.sender,
            block.timestamp
        );
    }

    function getPaper(
        uint256 _id
    )
        public
        view
        returns (
            uint256,
            string memory,
            string memory,
            address,
            uint256,
            bool
        )
    {
        ExamPaper memory paper = papers[_id];

        return (
            paper.id,
            paper.fileName,
            paper.paperHash,
            paper.uploadedBy,
            paper.timestamp,
            paper.exists
        );
    }

    function verifyPaper(
        uint256 _id,
        string memory _paperHash
    ) public view returns (bool) {
        ExamPaper memory paper = papers[_id];

        if (!paper.exists) {
            return false;
        }

        return keccak256(
            abi.encodePacked(paper.paperHash)
        ) == keccak256(
            abi.encodePacked(_paperHash)
        );
    }
}