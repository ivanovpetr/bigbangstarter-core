//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Funding is Ownable {
    using SafeMath for uint256;

    struct Campaign {
        uint256 id;
        address owner;
        uint256 target;
        uint256 funded;
        uint startedAt;
        uint finishedAt;
        bool collectedByOwner;
    }

    event CampaignCreated(uint256 id, address owner, uint256 target, uint256 startDate, uint256 finishDate);
    event CampaignFunded(uint256 indexed campaignId, address indexed funder, uint256 amount);
    event FundsWithdrawn(uint256 indexed campaignId, address indexed receiver, uint256 amount);

    Campaign[] public campaigns;

    mapping(address => mapping(uint256 => uint256)) public funds;

    modifier campaignExists(uint256 campaignId) {
        require(campaigns.length > campaignId, "Campaign doesn't exist");
        _;
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        return campaigns;
    }

    function getCampaign(uint256 campaignId) public view campaignExists(campaignId) returns (Campaign memory campaign) {
        Campaign memory c = campaigns[campaignId];
        return c;
    }

    function getBalance(uint256 campaignId, address funder) public view campaignExists(campaignId) returns (uint256) {
        return funds[funder][campaignId];
    }

    function createCampaign(address owner, uint256 target, uint256 startDate, uint256 finishDate) external onlyOwner returns (uint256) {
        require(startDate < finishDate, "Invalid dates, startDate later than finishDate");
        require(startDate > block.timestamp, "Start date is in the past");
        require(target > 0, "Invalid target");
        require(owner != address(0), "Invalid owner");

        campaigns.push();
        Campaign storage campaign = campaigns[campaigns.length - 1];
        campaign.id = campaigns.length-1;
        campaign.owner = owner;
        campaign.target = target;
        campaign.startedAt = startDate;
        campaign.finishedAt = finishDate;
        emit CampaignCreated(campaign.id, campaign.owner, campaign.target, campaign.startedAt, campaign.finishedAt);

        return campaigns.length-1;
    }

    function fund(uint256 campaignId) external payable campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(block.timestamp > campaign.startedAt, "Campaign is not started yet");
        require(block.timestamp < campaign.finishedAt, "Campaign is already finished");
        require(msg.sender != campaign.owner, "Owner cannot fund its own campaign");

        funds[msg.sender][campaignId] = funds[msg.sender][campaignId].add(msg.value);
        campaign.funded = campaign.funded.add(msg.value);
        emit CampaignFunded(campaignId, msg.sender, msg.value);
    }

    function withdraw(uint256 campaignId) external campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(block.timestamp > campaign.finishedAt, "Campaign is not finished yet");
        if (msg.sender == campaign.owner) {
            require(campaign.funded > campaign.target, "Campaign is failed, cannot collect funds by owner");
            require(!campaign.collectedByOwner, "Nothing to withdraw");

            campaign.collectedByOwner = true;
            payable(msg.sender).transfer(campaign.funded);
            emit FundsWithdrawn(campaignId, msg.sender, campaign.funded);
        } else {
            require(campaign.funded < campaign.target, "Campaign is succeeded, cannot collect funds by funders");
            uint256 balance = funds[msg.sender][campaignId];
            require(balance > 0, "Nothing to withdraw");

            funds[msg.sender][campaignId] = 0;
            payable(msg.sender).transfer(balance);
            emit FundsWithdrawn(campaignId, msg.sender, balance);
        }
    }
}
