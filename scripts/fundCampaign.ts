import {ethers, getUnnamedAccounts} from 'hardhat';
import {Funding} from "../typechain";
import {fundCampaign} from "./utils/funding";

// example script

const args = process.argv.slice(2);
const campaignId = args[0];
const sum = args[1];

async function main() {
  const [someone] = await getUnnamedAccounts();
  const sender = someone;
  if (sender) {
    const contract =  <Funding>await ethers.getContract(
      'Funding',
      sender
    );
    await fundCampaign(contract, someone, +campaignId, ethers.utils.parseEther(sum));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
