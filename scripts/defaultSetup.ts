import {getNamedAccounts, getUnnamedAccounts, ethers} from 'hardhat';
import {BigNumber} from 'ethers'
import moment from 'moment'
import {Funding} from '../typechain'

// function waitFor<T>(p: Promise<{wait: () => Promise<T>}>): Promise<T> {
//   return p.then((tx) => tx.wait());
// }

async function main() {
  //const [someone] = await getUnnamedAccounts();
  const {deployer, campaignCollector} = await getNamedAccounts();
  if (deployer) {
    const fundingContract =  <Funding>await ethers.getContract(
      'Funding',
      deployer
    );

    const id = await createCampaign(
      fundingContract,
      campaignCollector,
      ethers.utils.parseEther('10'),
      moment().add(1, 'minutes'),
      moment().add(1, 'days')
    )
    //console.log(await fundingContract.getCampaign(BigNumber.from(id)));
    //console.log(id)
  }
}

async function createCampaign(fundingContract: Funding, owner: string, target: BigNumber, startDate: moment.Moment, endDate: moment.Moment) {
  const result = await fundingContract.createCampaign(owner, target, BigNumber.from(startDate.unix()), BigNumber.from(endDate.unix()));

  const receipt = await result.wait()

  console.log(fundingContract.interface.decodeEventLog(fundingContract.interface.getEvent("CampaignCreated"), receipt.logs[0].data, receipt.logs[0].topics).id.toNumber())
}

// async function fundCampaign() {
//
// }
//
// async function fillCampaign() {
//
// }

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
