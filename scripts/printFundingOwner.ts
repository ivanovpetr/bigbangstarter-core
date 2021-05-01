import {getUnnamedAccounts, ethers} from 'hardhat';

// function waitFor<T>(p: Promise<{wait: () => Promise<T>}>): Promise<T> {
//   return p.then((tx) => tx.wait());
// }

async function main() {
  const [someone] = await getUnnamedAccounts();
    const sender = someone;
    if (sender) {
      const greetingsRegistryContract = await ethers.getContract(
        'Funding',
        sender
      );
      console.log(await greetingsRegistryContract.owner());
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
