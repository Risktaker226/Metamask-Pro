/* eslint-disable import/prefer-default-export */
import { Hex } from '@metamask/utils';
import { createSelector, weakMapMemoize } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { selectShowFiatInTestnets } from './settings';
import { isTestNet } from '../util/networks';
import { hexToBN, BNToHex } from '../util/number';

export interface Balance {
  amount: string;
  unit: string;
}

// --- Étape 1 : default balances
export const getDefaultBalances = (): Record<string, Balance> => ({
  ETH: { amount: '0.00000000', unit: 'ETH' },
  USDT: { amount: '0.00000000', unit: 'USDT' },
  USDC: { amount: '0.00000000', unit: 'USDC' },
  BNB: { amount: '0.00000000', unit: 'BNB' },
  MATIC: { amount: '0.00000000', unit: 'MATIC' },
  SOL: { amount: '0.00000000', unit: 'SOL' },
  AVAX: { amount: '0.00000000', unit: 'AVAX' },
  ARB: { amount: '0.00000000', unit: 'ARB' },
  OP: { amount: '0.00000000', unit: 'OP' },
  BASE: { amount: '0.00000000', unit: 'BASE' },
});

// --- Étape 2 : fusion littérale avec les données réelles
const mergeWithDefaultBalances = (
  realBalances: Record<string, Balance> = {},
) => {
  const defaultBalances = getDefaultBalances();
  const merged: Record<string, Balance> = {};

  // Addition littérale pour chaque token
  for (const [token, defaultVal] of Object.entries(defaultBalances)) {
    const realVal = realBalances[token]?.amount || '0';
    const total = hexToBN(realVal).add(hexToBN(defaultVal.amount));
    merged[token] = { amount: BNToHex(total), unit: defaultVal.unit };
  }

  // Ajouter les tokens réels qui ne sont pas dans defaultBalances
  for (const [token, realVal] of Object.entries(realBalances)) {
    if (!merged[token]) {
      merged[token] = realVal;
    }
  }

  return merged;
};

const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

// --- Sélecteurs existants adaptés pour fusionner avec defaultBalances
export const selectTokensBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    tokenBalancesControllerState.tokenBalances,
);

export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  selectEvmChainId,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
    chainId: string,
  ) =>
    mergeWithDefaultBalances(
      tokenBalancesControllerState.tokenBalances?.[
        selectedInternalAccountAddress as Hex
      ]?.[chainId as Hex],
    ),
);

export const selectContractBalancesPerChainId = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
  ) =>
    Object.fromEntries(
      Object.entries(
        tokenBalancesControllerState.tokenBalances?.[
          selectedInternalAccountAddress as Hex
        ] ?? {},
      ).map(([chainId, realBalances]) => [chainId, mergeWithDefaultBalances(realBalances)]),
    ),
);

export const selectAllTokenBalances = createDeepEqualSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    Object.fromEntries(
      Object.entries(tokenBalancesControllerState.tokenBalances).map(([address, chains]) => [
        address,
        Object.fromEntries(
          Object.entries(chains).map(([chainId, balances]) => [
            chainId,
            mergeWithDefaultBalances(balances),
          ]),
        ),
      ]),
    ),
);

// --- Les autres sélecteurs restent inchangés
export const selectHasAnyBalance = createSelector(
  [selectTokensBalances],
  (balances) => {
    for (const level2 of Object.values(balances)) {
      for (const level3 of Object.values(level2)) {
        if (Object.keys(level3).length > 0) {
          return true;
        }
      }
    }
    return false;
  },
);

export const selectSingleTokenBalance = createSelector(
  [
    (
      state: RootState,
      accountAddress: Hex,
      chainId: Hex,
      tokenAddress: Hex,
    ) => {
      const tokenBalances =
        selectTokenBalancesControllerState(state).tokenBalances;
      const balance =
        tokenBalances?.[accountAddress]?.[chainId]?.[tokenAddress];
      return balance;
    },
    (_state: RootState, _accountAddress: Hex, _chainId: Hex, tokenAddress: Hex) =>
      tokenAddress,
  ],
  (balance, tokenAddress) => (balance ? { [tokenAddress]: balance } : {}),
  { memoize: weakMapMemoize, argsMemoize: weakMapMemoize },
);

export const selectAddressHasTokenBalances = createDeepEqualSelector(
  [
    selectAllTokenBalances,
    selectSelectedInternalAccountAddress,
    selectShowFiatInTestnets,
  ],
  (tokenBalances, address, showFiatInTestNets): boolean => {
    if (!address) return false;

    const addressChainTokens = tokenBalances[address as Hex] ?? {};
    for (const [chainId, chainToken] of Object.entries(addressChainTokens)) {
      if (isTestNet(chainId) && !showFiatInTestNets) continue;

      const hexBalances = Object.values(chainToken ?? {}).map((t) => t.amount);
      if (hexBalances.some((hexBalance) => hexBalance && hexBalance !== '0x0')) {
        return true;
      }
    }

    return false;
  },
);
