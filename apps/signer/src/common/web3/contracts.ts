import { retryAsyncWithBackOffAndTimeout } from '@celo/base'
import { ContractKit } from '@celo/contractkit'
import { getDataEncryptionKey } from '@celo/phone-number-privacy-common'
import { BigNumber } from 'bignumber.js'
import Logger from 'bunyan'
import { config } from '../../config'
import { Counters, Histograms, newMeter } from '../metrics'

export async function getOnChainOdisPayments(
  kit: ContractKit,
  logger: Logger,
  account: string,
): Promise<BigNumber> {
  const _meter = newMeter(Histograms.fullNodeLatency, 'getOnChainOdisPayments')
  return _meter(() =>
    retryAsyncWithBackOffAndTimeout(
      async () => (await kit.contracts.getOdisPayments()).totalPaidCUSD(account),
      config.fullNodeRetryCount,
      [],
      config.fullNodeRetryDelayMs,
      undefined,
      config.fullNodeTimeoutMs,
    ).catch((err: any) => {
      logger.error(
        { err, account },
        `Error retrieving on-chain ODIS balance for account: ${account}. Please check network connectivity.`,
      )
      Counters.blockchainErrors.inc()
      throw err
    }),
  )
}

export async function getDEK(kit: ContractKit, logger: Logger, account: string): Promise<string> {
  const _meter = newMeter(Histograms.fullNodeLatency, 'getDataEncryptionKey')
  return _meter(() =>
    getDataEncryptionKey(
      account,
      kit,
      logger,
      config.fullNodeTimeoutMs,
      config.fullNodeRetryCount,
      config.fullNodeRetryDelayMs,
    ).catch((err) => {
      logger.error(
        { err, account },
        `Failed to retrieve Data Encryption Key (DEK) for account: ${account}. There may be an issue with blockchain access.`,
      )
      Counters.blockchainErrors.inc()
      throw err
    }),
  )
}
