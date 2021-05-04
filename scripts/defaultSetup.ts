import {getNamedAccounts, getUnnamedAccounts, ethers} from 'hardhat';
import {BigNumber} from 'ethers'
import {createCampaign, fundCampaign} from "./utils/funding";
import moment from 'moment'
import {Funding} from '../typechain'

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  //const [someone] = await getUnnamedAccounts();
  const {deployer, campaignCollector} = await getNamedAccounts();
  if (deployer) {
    const fundingContract =  <Funding>await ethers.getContract(
      'Funding',
      deployer
    );
    console.log("Creating campaign: finished, filled 100%", moment())
    const id1 = await createCampaign(
      fundingContract,
      campaignCollector,
      ethers.utils.parseEther('10'),
      moment().add(10, 'seconds'),
      moment().add(30, 'seconds')
    )
    await sleep(12000)
    await fundCampaign(fundingContract, deployer, id1, ethers.utils.parseEther('10'))
    console.log("Creating campaign: finished, filled 20%", moment())
    const id2 = await createCampaign(
      fundingContract,
      campaignCollector,
      ethers.utils.parseEther('10'),
      moment().add(10, 'seconds'),
      moment().add(20, 'seconds')
    )
    await sleep(12000)
    await fundCampaign(fundingContract, deployer, id2, ethers.utils.parseEther('2'))
    console.log("Creating campaign: in progress, filled 50%")
    const id3 = await createCampaign(
      fundingContract,
      campaignCollector,
      ethers.utils.parseEther('10'),
      moment().add(10, 'seconds'),
      moment().add(20, 'days')
    )
    await sleep(12000)
    await fundCampaign(fundingContract, deployer, id3, ethers.utils.parseEther('5'))
    console.log("Creating campaign: in progress, filled 0%")
    const id4 = await createCampaign(
      fundingContract,
      campaignCollector,
      ethers.utils.parseEther('10'),
      moment().add(10, 'seconds'),
      moment().add(20, 'days')
    )
    console.log("Creating campaign: not started, filled 0%")
    const id5 = await createCampaign(
      fundingContract,
      campaignCollector,
      ethers.utils.parseEther('10'),
      moment().add(10, 'days'),
      moment().add(20, 'days')
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
