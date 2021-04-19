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
        FundTx[] fundTxs;
        uint startedAt;
        uint finishedAt;
    }

    struct FundTx {
        address funder;
        uint256 amount;
        bool filled;
    }

    Campaign[] public campaigns;

    modifier campaignExists(uint256 campaignId) {
        require(campaigns.length > campaignId, "Campaign doesn't exist");
        _;
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        return campaigns;
    }

    function getCampaign(uint256 campaignId) public view returns (Campaign memory campaign) {
        Campaign memory c = campaigns[campaignId];
        return c;
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
        return campaigns.length-1;
    }

    function fund(uint256 campaignId) external payable campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(block.timestamp > campaign.startedAt, "Campaign is not started yet");
        require(block.timestamp < campaign.finishedAt, "Campaign is already finished");
        require(msg.sender != campaign.owner, "Owner cannot fund its own campaign");
        campaigns[campaignId].fundTxs.push(FundTx(msg.sender, msg.value, false));
    }

    function withdraw(uint256 campaignId) external campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(block.timestamp > campaign.finishedAt, "Campaign is not finished yet");
        uint256 toWithdraw = 0;
        if (msg.sender == campaign.owner) {
            require(fundsSum(campaign.fundTxs) > campaign.target,"Campaign is failed, cannot collect funds by owner");
            for(uint256 i = 0; i < campaign.fundTxs.length; i = i.add(1)) {
                if (!campaign.fundTxs[i].filled){
                    campaign.fundTxs[i].filled = true;
                    toWithdraw = toWithdraw.add(campaign.fundTxs[i].amount);
                }
            }
        } else {
            require(fundsSum(campaign.fundTxs) < campaign.target,"Campaign is succeeded, cannot collect funds by funders");
            for(uint256 i = 0; i < campaign.fundTxs.length; i = i.add(1)) {
                if (campaign.fundTxs[i].funder == msg.sender && !campaign.fundTxs[i].filled){
                    campaign.fundTxs[i].filled = true;
                    toWithdraw = toWithdraw.add(campaign.fundTxs[i].amount);
                }
            }
        }
        require(toWithdraw > 0, "Nothing to withdraw");
        payable(msg.sender).transfer(toWithdraw);
    }

    function fundsSum(FundTx[] memory funds ) public pure returns(uint256) {
        uint256 sum;
        for (uint256 i = 0; i < funds.length; i++) {
            sum += funds[i].amount;
        }
        return sum;
    }
}