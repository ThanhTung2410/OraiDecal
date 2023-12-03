import { isMobile } from '@walletconnect/browser-utils';
import { displayToast, TToastType } from 'components/Toasts/Toast';
import { network } from 'config/networks';
import { displayInstallWallet, setStorageKey } from 'helper';
import useConfigReducer from 'hooks/useConfigReducer';
import useLoadTokens from 'hooks/useLoadTokens';
import { useInactiveConnect } from 'hooks/useMetamask';
import { getCosmWasmClient } from 'libs/cosmjs';
import Keplr from 'libs/keplr';
import Metamask from 'libs/metamask';
import React, { useState } from 'react';
import ConnectWallet from './ConnectWallet';
import { WalletType } from '@oraichain/oraidex-common';

const RequireAuthButton: React.FC<any> = () => {
  const [, setIsInactiveMetamask] = useState(false);
  const [address, setAddress] = useConfigReducer('address');
  const [isSameAddress, setIsSameAddress] = useState(false);
  const [metamaskAddress, setMetamaskAddress] = useConfigReducer('metamaskAddress');
  const [tronAddress, setTronAddress] = useConfigReducer('tronAddress');
  const loadTokenAmounts = useLoadTokens();
  const connect = useInactiveConnect();

  const connectMetamask = async () => {
    try {
      setIsInactiveMetamask(false);

      // if chain id empty, we switch to default network which is BSC
      if (!window?.ethereum?.chainId) {
        await window.Metamask.switchNetwork(Networks.bsc);
      }

      await connect();
    } catch (ex) {
      console.log('error in connecting metamask: ', ex);
    }
  };

  const disconnectMetamask = async () => {
    try {
      setIsInactiveMetamask(true);
      setMetamaskAddress(undefined);
    } catch (ex) {
      console.log(ex);
    }
  };

  const connectTronLink = async () => {
    try {
      // if not requestAccounts before
      if (window.Metamask.checkTron() || new Metamask(window.tronWeb).checkTron()) {
        // TODO: Check owallet mobile
        let tronAddress: string;
        if (isMobile()) {
          const addressTronMobile = await window.tronLink.request({
            method: 'tron_requestAccounts'
          });
          //@ts-ignore
          tronAddress = addressTronMobile && addressTronMobile.base58;
        } else {
          if (!window.tronWeb.defaultAddress.base58) {
            const { code, message = 'Tronlink is not ready' } = await window.tronLink.request({
              method: 'tron_requestAccounts'
            });
            // throw error when not connected
            if (code !== 200) {
              displayToast(TToastType.TRONLINK_FAILED, { message });
              return;
            }
          }
          tronAddress = window.tronWeb.defaultAddress.base58;
        }
        loadTokenAmounts({ tronAddress });
        setTronAddress(tronAddress);
      }
    } catch (ex) {
      console.log('error in connecting tron link: ', ex);
      displayToast(TToastType.TRONLINK_FAILED, { message: JSON.stringify(ex) });
    }
  };

  const disconnectTronLink = async () => {
    try {
      setTronAddress(undefined);
      // remove account storage tron owallet
      localStorage.removeItem('tronWeb.defaultAddress');
    } catch (ex) {
      console.log(ex);
    }
  };

  const connectKeplr = async (type: WalletType) => {
    window.Keplr = new Keplr(type);
    setStorageKey('typeWallet', type);
    if (!(await window.Keplr.getKeplr())) {
      return displayInstallWallet();
    }
    const { client } = await getCosmWasmClient({ chainId: network.chainId });
    window.client = client;
    await window.Keplr.suggestChain(network.chainId);
    const oraiAddress = await window.Keplr.getKeplrAddr();
    if (oraiAddress === address) {
      setIsSameAddress(!isSameAddress);
    }
    loadTokenAmounts({ oraiAddress });
    setAddress(oraiAddress);
  };

  const disconnectKeplr = async () => {
    try {
      window.Keplr.disconnect();
      setAddress('');
    } catch (ex) {
      console.log(ex);
    }
  };

  return (
    <ConnectWallet
      connectMetamask={connectMetamask}
      connectKeplr={connectKeplr}
      disconnectMetamask={disconnectMetamask}
      disconnectKeplr={disconnectKeplr}
      connectTronLink={connectTronLink}
      disconnectTronLink={disconnectTronLink}
      address={address}
      metamaskAddress={metamaskAddress}
      tronAddress={tronAddress}
    />
  );
};

export default RequireAuthButton;
