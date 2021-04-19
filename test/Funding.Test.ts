import { ethers } from "hardhat";
import { expect } from "chai";
import {describe, it, before, beforeEach} from "mocha";
import {latest, duration, increase, ADDRESS_ZERO} from "./utils/time"

describe("Funding", function() {
    before(async function () {
        this.signers = await ethers.getSigners()
        this.Funding = await ethers.getContractFactory("Funding")
        this.alice = this.signers[0]
        this.bob = this.signers[1]
        this.carol = this.signers[2]
    })

    beforeEach(async function () {
        this.funding = await this.Funding.deploy()
        await this.funding.deployed()
    })

    it("only owner can create campaign", async function () {
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;

        await expect(this.funding.connect(this.bob).createCampaign(this.alice.address, target, startDate, finishDate))
            .to
            .be
            .revertedWith("Ownable: caller is not the owner")
    })

    it("cannot create campaign with start date after end date", async function () {
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(3))
        const target = 30;

        await expect(this.funding.createCampaign(this.alice.address, target, startDate, finishDate))
            .to
            .be
            .revertedWith("Invalid dates, startDate later than finishDate")
    })

    it("cannot create campaign with zero address owner", async function () {
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(5))
        const target = 30;

        await expect(this.funding.createCampaign(ADDRESS_ZERO, target, startDate, finishDate))
            .to
            .be
            .revertedWith("Invalid owner")
    })

    it("cannot create campaign with zero target", async function () {
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(5))
        const target = 0;

        await expect(this.funding.createCampaign(this.alice.address, target, startDate, finishDate))
            .to
            .be
            .revertedWith("Invalid target")
    })

    it("cannot create campaign with start date in the past", async function () {
        const startDate = (await latest()).sub(duration.days(4))
        const finishDate = (await latest()).add(duration.days(3))
        const target = 30;

        await expect(this.funding.createCampaign(this.alice.address, target, startDate, finishDate))
            .to
            .be
            .revertedWith("Start date is in the past")
    })

    it("createdCampaign appears in campaign list", async function() {
        //create campaign
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //retrieve created campaign
        const campaign = await this.funding.getCampaign(0)
        //expect all field are correct
        expect(campaign.id).to.equal(0)
        expect(campaign.owner).to.equal(this.bob.address)
        expect(campaign.target).to.equal(target)
        expect(campaign.fundTxs.length).to.equal(0)
        expect(campaign.startedAt).to.equal(startDate)
        expect(campaign.finishedAt).to.equal(finishDate)
    })

    it("cannot fund not started campaign", async function (){
        //create campaign
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //expect fail funding not started campaign
        await expect(this.funding.fund(0, {value: 15})).to.be.revertedWith("Campaign is not started yet")
    })

    it("owner cannot fund its own campaign", async function () {
        //create campaign
        const startDate = (await latest()).add(duration.days(2))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //advance time to after finish date
        await increase(duration.days(5))
        //expect fail funding finished campaign
        await expect(this.funding.connect(this.bob).fund(0, {value: 15})).to.be.revertedWith("Owner cannot fund its own campaign")
    })

    it("cannot fund finished campaign", async function (){
        //create campaign
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //advance time to after finish date
        await increase(duration.days(7))
        //expect fail funding finished campaign
        await expect(this.funding.fund(0, {value: 15})).to.be.revertedWith("Campaign is already finished")
    })

    it("cannot fund non-existent campaign", async function (){
        await expect(this.funding.fund(0, {value: 15})).to.be.revertedWith("Campaign doesn't exist")
    })

    it("fund campaign correctly", async function () {
        const startDate = (await latest()).add(duration.days(4))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //advance time after start date
        await increase(duration.days(5))
        //fund campaign
        const fundSum = 100
        const beforeBalance = await ethers.provider.getBalance(this.funding.address)
        await this.funding.fund(0, {value: fundSum})
        const afterBalance = await ethers.provider.getBalance(this.funding.address)
        //expect funder balance was decreased
        expect(beforeBalance).to.be.equal(afterBalance.sub(fundSum))
        //expect correct funding entry
        const campaign = await this.funding.getCampaign(0)
        expect(campaign.fundTxs.length).to.equal(1)
        expect(campaign.fundTxs[0].amount).to.equal(fundSum)
        expect(campaign.fundTxs[0].funder).to.equal(this.alice.address)
    })

    it("cannot withdraw from non-existent campaign", async function(){
        await expect(this.funding.withdraw(0)).to.be.revertedWith("Campaign doesn't exist")
    })

    it("funder cannot withdraw from successful campaign", async function() {
        //create campaign
        const startDate = (await latest()).add(duration.days(3))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        await increase(duration.days(5))
        //fulfill campaign
        const fundSum = 100
        await this.funding.connect(this.alice).fund(0, {value: fundSum})
        //advance campaign to finish
        await increase(duration.days(2))
        //expect withdraw by funder failed
        await expect(this.funding.withdraw(0)).to.be.revertedWith("Campaign is succeeded, cannot collect funds by funders")
    })

    it("funder can withdraw from failed campaign", async function() {
        //create campaign
        const startDate = (await latest()).add(duration.days(1))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //advance campaign active state
        await increase(duration.days(5))
        //fulfill campaign partially
        const fundSum = 10
        await this.funding.connect(this.alice).fund(0, {value: fundSum})
        await this.funding.connect(this.alice).fund(0, {value: 5})
        //advance campaign to finish
        await increase(duration.days(5))
        //expect withdraw by funder
        const beforeBalance = await ethers.provider.getBalance(this.funding.address)
        await this.funding.connect(this.alice).withdraw(0)
        const afterBalance = await ethers.provider.getBalance(this.funding.address)
        expect(beforeBalance).to.equal(afterBalance.add(fundSum+5))
        //cannot withdarw repeatedly
        await expect(this.funding.connect(this.alice).withdraw(0)).to.be.revertedWith("Nothing to withdraw")
    })

    it("owner cannot withdraw from failed campaign", async function() {
        //create campaign
        const startDate = (await latest()).add(duration.days(1))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //advance campaign active state
        await increase(duration.days(5))
        //fulfill campaign partialy
        const fundSum = 10
        await this.funding.connect(this.alice).fund(0, {value: fundSum})
        //advance campaign to finish
        await increase(duration.days(2))
        //expect withdraw by owner failed
        await expect(this.funding.connect(this.bob).withdraw(0)).to.be.revertedWith("Campaign is failed, cannot collect funds by owner")
    })

    it("owner can withdraw from successful campaign", async function() {
        //create campaign
        const startDate = (await latest()).add(duration.days(1))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //advance campaign active state
        await increase(duration.days(5))
        //fulfill campaign
        const fundSum = 100
        await this.funding.connect(this.alice).fund(0, {value: fundSum})
        //advance campaign to finish
        await increase(duration.days(2))
        //expect withdraw by owner
        const beforeBalance = await ethers.provider.getBalance(this.funding.address)
        await this.funding.connect(this.bob).withdraw(0)
        const afterBalance = await ethers.provider.getBalance(this.funding.address)
        expect(beforeBalance).to.equal(afterBalance.add(fundSum))

        await expect(this.funding.connect(this.bob).withdraw(0)).to.be.revertedWith("Nothing to withdraw")
    })

    it("cannot withdraw from in progress or not started campaign", async function(){
        //create campaign
        const startDate = (await latest()).add(duration.days(6))
        const finishDate = (await latest()).add(duration.days(8))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //expect withdraw failed from not started campaign
        await expect(this.funding.connect(this.bob).withdraw(0)).to.be.revertedWith("Campaign is not finished yet")
        //advance campaign active state
        await increase(duration.days(7))
        //expect withdraw failed from in progress campaign
        await expect(this.funding.connect(this.bob).withdraw(0)).to.be.revertedWith("Campaign is not finished yet")
    })

    it("funders cannot withdraw from campaign where they have no funding", async function(){
        //create campaign
        const startDate = (await latest()).add(duration.days(1))
        const finishDate = (await latest()).add(duration.days(6))
        const target = 30;
        await this.funding.createCampaign(this.bob.address, target, startDate, finishDate)
        //advance campaign active state
        await increase(duration.days(5))
        //fulfill campaign partially
        const fundSum = 10
        await this.funding.connect(this.alice).fund(0, {value: fundSum})
        await this.funding.connect(this.alice).fund(0, {value: 5})
        //advance campaign to finish
        await increase(duration.days(5))
        //cannot withdarw by third person
        await expect(this.funding.connect(this.carol).withdraw(0)).to.be.revertedWith("Nothing to withdraw")
    })
})
