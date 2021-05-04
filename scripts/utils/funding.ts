import {Funding} from "../../typechain";
import {BigNumber} from "ethers";
import moment from "moment";

export async function createCampaign(contract: Funding, owner: string, target: BigNumber, startDate: moment.Moment, endDate: moment.Moment): Promise<number> {
  const result = await contract.createCampaign(owner, target, BigNumber.from(startDate.unix()), BigNumber.from(endDate.unix()));

  const receipt = await result.wait()

  return contract.interface.decodeEventLog(contract.interface.getEvent("CampaignCreated"), receipt.logs[0].data, receipt.logs[0].topics).id.toNumber()
}

export async function fundCampaign(contract: Funding, funder: string, campaignId: number, amount: BigNumber): Promise<boolean> {
  const result = await contract.fund(BigNumber.from(campaignId), {from: funder, value: amount} )
  const receipt = await result.wait()
  return receipt.status === 1;
}
