import {getUnnamedAccounts, ethers} from 'hardhat';
import moment from "moment";
import {Funding} from "../typechain";

async function main() {
  const [someone] = await getUnnamedAccounts();
  const sender = someone;
  if (sender) {
    const fundingContract =  <Funding>await ethers.getContract(
      'Funding',
      sender
    );
    const campaigns = await fundingContract.getCampaigns()
    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i]
      let status: string
      const now = moment().unix()
      if (now <= c.startedAt.toNumber()) {
        status = "not started"
      } else if (now <= c.finishedAt.toNumber()) {
        status = "in progress"
      } else {
        status = "finished"
      }
      const funded = ethers.utils.formatEther(c.funded)
      const target = ethers.utils.formatEther(c.target)

      console.log(`Campaign ${c.id} is ${status} funded ${funded}/${target} owner is ${c.owner}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
