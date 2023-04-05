import React, { useState } from "react";
import { generatePrivate } from "@toruslabs/eccrypto";
import "./App.css";
import TorusServiceProvider from "@tkey/service-provider-torus";
import SecurityQuestionsModule from "@tkey/security-questions";
import TorusStorageLayer from "@tkey/storage-layer-torus";
import { WebStorageModule } from "@tkey/web-storage";
import ThresholdKey from "@tkey/default";
import BN from "bn.js";
import { ShareStore } from "@tkey/common-types";

const customAuthParams = {
  baseUrl: `${window.location.origin}/serviceworker`,
  enableLogging: true,
  network: "testnet" as any,
};
const privateKey = generatePrivate();
console.log("🚀 ~ file: App.tsx:20 ~ privateKey", privateKey.toString("hex"));
const serviceProvider = new TorusServiceProvider({
  // postboxKey: privateKey.toString("hex"),
  customAuthArgs: customAuthParams,
});
const securityQuestionsModule = new SecurityQuestionsModule(true);
const storageLayer = new TorusStorageLayer({
  hostUrl: "https://metadata.tor.us",
});
const webStorage = new WebStorageModule();

interface IGlobalListShare {
  deviceShare: ShareStore;
  privKey: string;
  serviceProviderShare: ShareStore;
  passwordShare: ShareStore;
}

const tkey = new ThresholdKey({
  serviceProvider,
  storageLayer,
  manualSync: false,
  modules: {
    securityQuestionsModule,
    webStorage,
  },
});

function App() {
  let globalListShare = {};
  async function handleSplitKey() {
    await (tkey.serviceProvider as any).init({
      skipSw: false,
      skipPrefetch: false,
    });

    await tkey.initialize({
      importKey: new BN(privateKey, "hex"),
    });
    const { privKey } = await tkey.reconstructKey(false);
    const stringPrivKey = privKey.toString("hex");
    console.log(
      "🚀 ~ file: App.tsx:57 ~ handleSplitKey ~ stringPrivKey:",
      stringPrivKey
    );
    const ShareC = await (
      tkey.modules.securityQuestionsModule as SecurityQuestionsModule
    ).generateNewShareWithSecurityQuestions(
      stringPrivKey,
      "what's your password?"
    );
    const indexShareC = ShareC.newShareIndex.toString("hex");
    const storeShareC = ShareC.newShareStores[indexShareC];
    const deviceShare = webStorage.getDeviceShare();
    const shareIndex = "1";
    const outputShareStore1 = tkey.outputShareStore(shareIndex);
    const outputShareStoreDevice = tkey.outputShareStore(
      (await deviceShare).share.shareIndex
    );
    const listShare = {
      deviceShare: outputShareStoreDevice,
      privKey: privKey.toString(16, 64),
      serviceProviderShare: outputShareStore1,
      passwordShare: storeShareC,
    };
    globalListShare = listShare;
    console.log(
      "share1 : ",
      listShare.serviceProviderShare.share.share.toString(16, 64)
    );
    console.log(
      "share2 : ",
      listShare.deviceShare.share.share.toString(16, 64)
    );
    console.log(
      "share3 : ",
      listShare.passwordShare.share.share.toString(16, 64)
    );
  }
  let test = 0;
  const handleTest = async () => {
    test++;
  };
  const logtest = () => {
    console.log(test);
    console.log(globalListShare);
  };
  // const sync = async () => {
  //   console.log("syncing");
  //   await tkey.syncLocalMetadataTransitions();
  //   console.log("synced");
  // };

  const linkGoogle = async () => {
    const loginResponse = await (tkey.serviceProvider as any).triggerLogin({
      typeOfLogin: "google",
      verifier: "google-tkey-w3a",
      clientId:
        "774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com",
    });
    console.log("loginResponse", loginResponse);
    const { serviceProvider } = tkey;
    const { serviceProviderShare }: IGlobalListShare = globalListShare as any;
    await tkey.storageLayer.setMetadata({
      input: serviceProviderShare,
      serviceProvider,
    });
    await tkey.addShareDescription(
      "1",
      JSON.stringify({
        module: "serviceProvider",
        id: loginResponse.userInfo.email,
      }),
      true
    );
    console.log(
      "serviceProviderShare",
      serviceProviderShare.share.share.toString(16, 64)
    );
    console.log("email", loginResponse.userInfo.email);
    await tkey.syncLocalMetadataTransitions();
    const i = await tkey.storageLayer.getMetadata({
      serviceProvider: tkey.serviceProvider,
    });
    const o = await tkey.catchupToLatestShare({
      shareStore: i as any,
    });
    console.log("o", o.latestShare.share.share.toString(16, 64));
  };

  const allowDevice = async () => {
    if ((globalListShare as any).deviceShare) {
      console.log("have device share");
      localStorage.setItem(
        "device_share",
        JSON.stringify((globalListShare as IGlobalListShare).deviceShare)
      );
      console.log(
        "device share",
        (globalListShare as IGlobalListShare).deviceShare
      );
      return;
    }
    console.log("no device share");
    const deviceShare = await tkey.generateNewShare();
    await tkey.storeDeviceShare(
      deviceShare.newShareStores[deviceShare.newShareIndex.toString("hex")]
    );
    localStorage.setItem(
      "device_share",
      JSON.stringify(
        deviceShare.newShareStores[deviceShare.newShareIndex.toString("hex")]
      )
    );
    console.log(
      "device share",
      deviceShare.newShareStores[deviceShare.newShareIndex.toString("hex")]
    );
  };

  const [password, setPassword] = useState("");
  const handlePassword = (e: any) => {
    setPassword(e.target.value);
  };

  const handleSetPassword = async () => {
    await (
      tkey.modules.securityQuestionsModule as SecurityQuestionsModule
    ).changeSecurityQuestionAndAnswer(
      "123456haha$%DS#",
      "what's your password?"
    );
    console.log("set password");
  };

  const handlesync = async () => {
    const detailsBefore = tkey.getKeyDetails();
    console.log("details Before", detailsBefore);
    await tkey.syncLocalMetadataTransitions();
    console.log("synced");
    const detailsAfter = tkey.getKeyDetails();
    console.log("details After", detailsAfter);
  };

  const handleGetMetaData = async () => {
    await (tkey.serviceProvider as any).init({
      skipSw: false,
      skipPrefetch: false,
    });

    await tkey.initialize({});
    const loginResponse = await (tkey.serviceProvider as any).triggerLogin({
      typeOfLogin: "google",
      verifier: "google-tkey-w3a",
      clientId:
        "774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com",
    });
    const metaData = await tkey.storageLayer.getMetadata({
      serviceProvider: tkey.serviceProvider,
    });
    console.log("metaData", metaData);
  };

  return (
    <div>
      <button onClick={handleSplitKey}>spit key</button>
      {/* <button onClick={sync}>sync</button> */}
      <button onClick={handleTest}>test+=</button>
      <button onClick={logtest}>logtest</button>
      <button onClick={linkGoogle}>link google</button>
      <button onClick={allowDevice}>allow device</button>
      <input type="text" onChange={handlePassword} />
      <button onClick={handleSetPassword}>set password</button>
      <button onClick={handlesync}>sync</button>
      <button onClick={handleGetMetaData}>get meta data</button>
    </div>
  );
}

export default App;
