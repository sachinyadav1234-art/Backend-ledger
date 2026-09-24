const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    let transaction;
    let session;
    let sessionOpt = {};
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        sessionOpt = { session };
    } catch (e) {
        session = null;
    }

    try {
        /**
         * 5. Create transaction (PENDING)
         */
        try {
            transaction = (await transactionModel.create([ {
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            } ], sessionOpt))[ 0 ]
        } catch (error) {
            if (session && (error.message?.includes("Transaction numbers are only allowed") || error.message?.includes("retryable writes"))) {
                session.endSession();
                session = null;
                sessionOpt = {};
                transaction = (await transactionModel.create([ {
                    fromAccount,
                    toAccount,
                    amount,
                    idempotencyKey,
                    status: "PENDING"
                } ]))[ 0 ]
            } else {
                throw error;
            }
        }

        const debitLedgerEntry = await ledgerModel.create([ {
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], sessionOpt)

        const creditLedgerEntry = await ledgerModel.create([ {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], sessionOpt)

        const updatedTransaction = await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { ...sessionOpt, returnDocument: 'after' }
        )

        if (updatedTransaction) {
            transaction = updatedTransaction;
        } else {
            transaction.status = "COMPLETED";
        }

        if (session) {
            await session.commitTransaction()
        }
    } catch (error) {
        if (session) {
            await session.abortTransaction()
        }
        return res.status(400).json({
            message: "Transaction failed to process. Please retry.",
            error: error.message || error
        })
    } finally {
        if (session) {
            session.endSession()
        }
    }

    /**
     * 10. Send email notification
     */
    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    let fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        fromUserAccount = await accountModel.create({
            user: req.user._id
        })
    }

    if (fromUserAccount._id.toString() === toUserAccount._id.toString()) {
        return res.status(400).json({
            message: "Target account (toAccount) must be a user account different from the system account"
        })
    }

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both system account and target account must be ACTIVE to process transaction"
        })
    }

    let transaction;
    let session;
    let sessionOpt = {};
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        sessionOpt = { session };
    } catch (e) {
        session = null;
    }

    try {
        try {
            transaction = (await transactionModel.create([ {
                fromAccount: fromUserAccount._id,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            } ], sessionOpt))[ 0 ];
        } catch (error) {
            if (session && (error.message?.includes("Transaction numbers are only allowed") || error.message?.includes("retryable writes"))) {
                session.endSession();
                session = null;
                sessionOpt = {};
                transaction = (await transactionModel.create([ {
                    fromAccount: fromUserAccount._id,
                    toAccount,
                    amount,
                    idempotencyKey,
                    status: "PENDING"
                } ]))[ 0 ];
            } else {
                throw error;
            }
        }

        await ledgerModel.create([ {
            account: fromUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], sessionOpt)

        await ledgerModel.create([ {
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], sessionOpt)

        const updatedTransaction = await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { ...sessionOpt, returnDocument: 'after' }
        )

        if (updatedTransaction) {
            transaction = updatedTransaction;
        } else {
            transaction.status = "COMPLETED"
        }

        if (session) {
            await session.commitTransaction()
        }
    } catch (error) {
        if (session) {
            await session.abortTransaction()
        }
        return res.status(400).json({
            message: "Initial funds transaction failed to process. Please retry.",
            error: error.message || error
        })
    } finally {
        if (session) {
            session.endSession()
        }
    }

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}