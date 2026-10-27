import { expect } from "chai";
import { ethers } from "hardhat";
import { VaultFactory, ClubVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaultFactory Registry Test Suite", function () {
  let factory: VaultFactory;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    const VaultFactoryArtifact = await ethers.getContractFactory("VaultFactory");
    factory = await VaultFactoryArtifact.deploy();
    await factory.waitForDeployment();
  });

  it("should deploy a new ClubVault instance and register it", async function () {
    const tx = await factory
      .connect(user1)
      .createVault(
        "AI Innovation Guild",
        "Treasury for student AI compute grants",
        [user1.address, user2.address],
        2
      );

    const receipt = await tx.wait();
    expect(await factory.totalVaults()).to.equal(1);

    const vaults = await factory.getAllVaults();
    expect(vaults.length).to.equal(1);
    const vaultAddr = vaults[0];
    expect(await factory.isRegisteredVault(vaultAddr)).to.be.true;

    // Check member indexing
    const user1Vaults = await factory.getVaultsForMember(user1.address);
    const user2Vaults = await factory.getVaultsForMember(user2.address);
    const user3Vaults = await factory.getVaultsForMember(user3.address);

    expect(user1Vaults).to.include(vaultAddr);
    expect(user2Vaults).to.include(vaultAddr);
    expect(user3Vaults).to.not.include(vaultAddr);

    // Verify deployed vault parameters directly
    const ClubVaultArtifact = await ethers.getContractFactory("ClubVault");
    const vault = ClubVaultArtifact.attach(vaultAddr) as ClubVault;
    expect(await vault.clubName()).to.equal("AI Innovation Guild");
    expect(await vault.memberCount()).to.equal(2);
    expect(await vault.requiredApprovals()).to.equal(2);
  });

  it("should support multiple vaults and member queries", async function () {
    await factory.createVault("Club Alpha", "Alpha DAO", [user1.address, user2.address], 1);
    await factory.createVault("Club Beta", "Beta DAO", [user2.address, user3.address], 2);

    expect(await factory.totalVaults()).to.equal(2);
    const user2Vaults = await factory.getVaultsForMember(user2.address);
    expect(user2Vaults.length).to.equal(2);
  });
});
