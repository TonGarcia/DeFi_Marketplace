import {NiutrollerErr, TokenErr} from './ErrorReporterConstants';

export interface ErrorReporter {
  getError(error: any): string | null
  getInfo(info: any): string | null
  getDetail(error: any, detail: number): string
}

class NoErrorReporterType implements ErrorReporter {
  getError(error: any): string | null {
    return null;
  }

  getInfo(info: any): string | null {
    return null;
  }

  getDetail(error: any, detail: number): string {
    return detail.toString();
  }
}

class CTokenErrorReporterType implements ErrorReporter {
  getError(error: any): string | null {
    if (error === null) {
      return null;
    } else {
      return TokenErr.ErrorInv[Number(error)];
    }
  }

  getInfo(info: any): string | null {
    if (info === null) {
      return null;
    } else {
      return TokenErr.FailureInfoInv[Number(info)];
    }
  }

  getDetail(error: any, detail: number): string {
    // Little hack to let us use proper names for cross-contract errors
    if (this.getError(error) === "COMPTROLLER_REJECTION") {
      let comptrollerError = NiutrollerErrorReporter.getError(detail);

      if (comptrollerError) {
        return comptrollerError;
      }
    }

    return detail.toString();
  }
}

class NiutrollerErrorReporterType implements ErrorReporter {
  getError(error: any): string | null {
    if (error === null) {
      return null;
    } else {
      // TODO: This probably isn't right...
      return NiutrollerErr.ErrorInv[Number(error)];
    }
  }

  getInfo(info: any): string | null {
    if (info === null) {
      return null;
    } else {
      // TODO: This probably isn't right...
      return NiutrollerErr.FailureInfoInv[Number(info)];
    }
  }

  getDetail(error: any, detail: number): string {
    if (this.getError(error) === "REJECTION") {
      let comptrollerError = NiutrollerErrorReporter.getError(detail);

      if (comptrollerError) {
        return comptrollerError;
      }
    }

    return detail.toString();
  }
}

export function formatResult(errorReporter: ErrorReporter, result: any): string {
  const errorStr = errorReporter.getError(result);
  if (errorStr !== null) {
    return `Error=${errorStr}`
  } else {
    return `Result=${result}`;
  }
}

// Singleton instances
export const NoErrorReporter = new NoErrorReporterType();
export const CTokenErrorReporter = new CTokenErrorReporterType();
export const NiutrollerErrorReporter = new NiutrollerErrorReporterType();
