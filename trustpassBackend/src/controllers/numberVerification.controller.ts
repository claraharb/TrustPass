import { Request, Response } from "express";

import prisma from "../config/prisma";

import {
  createNumberVerificationAuthorizationUrl,
  handleNumberVerificationCallback,
} from "../services/numberVerification.service";

import {
  collectNumberVerificationSignal,
  collectSelectedEvidence,
} from "../services/networkSignal.service";

import {
  assessProtectedAction,
} from "../services/trustEngine.service";

import {
  calculateTrustDecision,
  saveTrustDecision,
} from "../services/trustDecision.service";


/**
 * Standalone Number Verification endpoint.
 *
 * The Trust Check flow starts Number Verification automatically
 * when the AI Agent selects it.
 */
export function startNumberVerification(
  req: Request,
  res: Response
) {

  try {

    const phoneNumber =
      req.query.phoneNumber;


    if (
      typeof phoneNumber !== "string" ||
      !phoneNumber.trim()
    ) {

      return res.status(400).json({

        error:
          "phoneNumber is required",
      });
    }


    /*
     * TrustRequest ID = 0 here because this is the
     * standalone testing endpoint.
     *
     * The real Trust Check flow uses the actual
     * TrustRequest database ID.
     */

    const result =
      createNumberVerificationAuthorizationUrl(
        phoneNumber,
        0
      );


    return res.json({

      message:
        "Open the authorization URL on the end user's mobile device.",

      authorizationUrl:
        result.authorizationUrl,
    });

  } catch (error) {

    console.error(
      "Number Verification start failed:",
      error
    );


    return res.status(500).json({

      error:
        "Failed to start Number Verification",
    });
  }
}


/**
 * Nokia redirects here after OAuth authorization.
 *
 * Flow:
 *
 * Nokia
 *   ↓
 * OAuth callback
 *   ↓
 * Verify phone number
 *   ↓
 * Find TrustRequest
 *   ↓
 * Check whether request is already completed
 *   ↓
 * Save NUMBER_VERIFICATION signal
 *   ↓
 * Load AI-selected signals
 *   ↓
 * Collect remaining evidence
 *   ↓
 * Trust Engine
 *   ↓
 * Final decision
 */

export async function numberVerificationCallback(
  req: Request,
  res: Response
) {

  try {

    const {
      code,
      state,
      error,
    } = req.query;


    if (error) {

      return res.status(400).json({

        error:
          "Number Verification authorization was denied",

        details:
          error,
      });
    }


    if (
      typeof code !== "string" ||
      typeof state !== "string"
    ) {

      return res.status(400).json({

        error:
          "Missing authorization code or state",
      });
    }


    const verificationResult =
      await handleNumberVerificationCallback(
        code,
        state
      );


    console.log(
      "📱 Number Verification completed:",
      verificationResult
    );


    const trustRequest =
      await prisma.trustRequest.findUnique({

        where: {

          id:
            verificationResult.trustRequestId,
        },

        include: {

          protectedAction: true,
        },
      });


    if (!trustRequest) {

      return res.status(404).json({

        error:
          "Associated TrustRequest not found",
      });
    }


    if (
      trustRequest.status !== "PENDING"
    ) {

      console.log(
        `🔁 TrustRequest ${trustRequest.id} is already ${trustRequest.status}.`
      );


      const existingDecision =
        await prisma.trustDecision.findUnique({

          where: {

            trustRequestId:
              trustRequest.id,
          },
        });


      /*
       * If the request is already completed and a decision
       * exists, return the existing result instead of
       * processing the entire request again.
       */

      if (existingDecision) {

        return res.status(200).json({

          success: true,

          requestId:
            trustRequest.requestId,

          status:
            "COMPLETED",

          numberVerification: {

            verified:
              verificationResult.verified,

            phoneNumber:
              verificationResult.phoneNumber,
          },

          decision: {

            trustScore:
              existingDecision.trustScore,

            riskLevel:
              existingDecision.riskLevel,

            decision:
              existingDecision.decision,

            explanation:
              existingDecision.explanation,
          },

          message:
            "Trust assessment was already completed.",
        });
      }


      /*
       * If the request is not pending but there is no
       * saved decision, keep the original conflict behavior.
       */

      return res.status(409).json({

        error:
          "TrustRequest is no longer pending",

        requestId:
          trustRequest.requestId,

        status:
          trustRequest.status,
      });
    }


    const numberVerificationSignal =
      await collectNumberVerificationSignal(

        trustRequest.id,

        verificationResult.verified
      );


    console.log(
      "📡 NUMBER_VERIFICATION signal saved:",
      numberVerificationSignal
    );


    let selectedSignals: string[] = [];


    if (
      trustRequest.aiSelectedSignals
    ) {

      try {

        const parsedSignals =
          JSON.parse(
            trustRequest.aiSelectedSignals
          );


        if (
          Array.isArray(parsedSignals)
        ) {

          selectedSignals =
            parsedSignals.filter(
              (signal): signal is string =>
                typeof signal === "string"
            );
        }

      } catch (error) {

        console.error(
          "Failed to parse AI-selected signals:",
          error
        );


        return res.status(500).json({

          error:
            "Invalid AI-selected signals stored for TrustRequest",
        });
      }
    }


    console.log(
      "🤖 Stored AI-selected signals:",
      selectedSignals
    );


    /*
     * NUMBER_VERIFICATION has already been collected.
     *
     * collectSelectedEvidence() intentionally skips
     * NUMBER_VERIFICATION and executes the remaining
     * synchronous network APIs such as:
     *
     * SIM_SWAP
     * DEVICE_SWAP
     * DEVICE_STATUS
     */

    const remainingSignals =
      await collectSelectedEvidence(

        trustRequest.id,

        selectedSignals.filter(
          (signal) =>
            signal !==
            "NUMBER_VERIFICATION"
        ),

        trustRequest.phoneNumber ??
          undefined
      );


    const signals = [

      numberVerificationSignal,

      ...remainingSignals,
    ];


    console.log(
      "📡 Complete evidence set:"
    );


    console.log(
      JSON.stringify(
        signals,
        null,
        2
      )
    );


    const assessment =
      await assessProtectedAction({

        protectedActionId:
          trustRequest.protectedActionId,

        phoneNumber:
          trustRequest.phoneNumber ??
          undefined,

        ipAddress:
          trustRequest.ipAddress ??
          undefined,

        userAgent:
          trustRequest.userAgent ??
          undefined,
      });


    const decisionResult =
      calculateTrustDecision({

        actionRiskLevel:
          assessment.actionRiskLevel,

        signals:
          signals.map(
            (signal) => ({

              signalType:
                signal.signalType,

              riskScore:
                signal.riskScore,

              isPositive:
                signal.isPositive,

              details:
                signal.details,
            })
          ),
      });


    console.log(
      "🛡️ Final TrustPass decision:",
      decisionResult
    );


    const savedDecision =
      await saveTrustDecision(

        trustRequest.id,

        decisionResult
      );


    return res.status(200).json({

      success: true,

      requestId:
        trustRequest.requestId,

      status:
        "COMPLETED",

      numberVerification: {

        verified:
          verificationResult.verified,

        phoneNumber:
          verificationResult.phoneNumber,
      },

      assessment: {

        actionRiskLevel:
          assessment.actionRiskLevel,

        evidenceRequirements:
          assessment.evidenceRequirements,
      },

      aiAgent: {

        selectedSignals,

        evidenceUsed:
          signals.map(
            (signal) =>
              signal.signalType
          ),
      },

      signals,

      decision: {

        trustScore:
          savedDecision.trustScore,

        riskLevel:
          savedDecision.riskLevel,

        decision:
          savedDecision.decision,

        explanation:
          savedDecision.explanation,
      },

      message:
        "Trust assessment completed after Number Verification.",
    });


  } catch (error) {

    console.error(
      "Number Verification callback failed:",
      error
    );


    return res.status(500).json({

      error:
        "Number Verification failed",
    });
  }
}
