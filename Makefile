
# Run a single cvl e.g.:
#  make -B spec/certora/NErc20/borrowAndRepayFresh.cvl

# TODO:
#  - mintAndRedeemFresh.cvl in progress and is failing due to issues with tool proving how the exchange rate can change
#    hoping for better division modelling - currently fails to prove (a + 1) / b >= a / b
#  - NErc20Delegator/*.cvl cannot yet be run with the tool
#  - cDAI proofs are WIP, require using the delegate and the new revert message assertions

.PHONY: certora-clean

CERTORA_BIN = $(abspath script/certora)
CERTORA_RUN = $(CERTORA_BIN)/run.py
CERTORA_CLI = $(CERTORA_BIN)/cli.jar
CERTORA_EMV = $(CERTORA_BIN)/emv.jar

export CERTORA = $(CERTORA_BIN)
export CERTORA_DISABLE_POPUP = 1

spec/certora/Math/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/MathCertora.sol \
	--verify \
	 MathCertora:$@

spec/certora/Niu/search.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/NiuCertora.sol \
	--settings -b=4,-graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 NiuCertora:$@

spec/certora/Niu/transfer.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/NiuCertora.sol \
	--settings -graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 NiuCertora:$@

spec/certora/Governor/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/GovernorAlphaCertora.sol \
	 spec/certora/contracts/TimelockCertora.sol \
	 spec/certora/contracts/NiuCertora.sol \
	 --settings -assumeUnwindCond,-enableWildcardInlining=false \
	 --solc_args "'--evm-version istanbul'" \
	 --link \
	 GovernorAlphaCertora:timelock=TimelockCertora \
	 GovernorAlphaCertora:comp=NiuCertora \
	--verify \
	 GovernorAlphaCertora:$@

spec/certora/Niutroller/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/NiutrollerCertora.sol \
	 spec/certora/contracts/PriceOracleModel.sol \
	--link \
	 NiutrollerCertora:oracle=PriceOracleModel \
	--verify \
	 NiutrollerCertora:$@

spec/certora/cDAI/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/CDaiDelegateCertora.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	 spec/certora/contracts/mcd/dai.sol:Dai \
	 spec/certora/contracts/mcd/pot.sol:Pot \
	 spec/certora/contracts/mcd/vat.sol:Vat \
	 spec/certora/contracts/mcd/join.sol:DaiJoin \
	 tests/Contracts/BoolNiutroller.sol \
	--link \
	 CDaiDelegateCertora:comptroller=BoolNiutroller \
	 CDaiDelegateCertora:underlying=Dai \
	 CDaiDelegateCertora:potAddress=Pot \
	 CDaiDelegateCertora:vatAddress=Vat \
	 CDaiDelegateCertora:daiJoinAddress=DaiJoin \
	--verify \
	 CDaiDelegateCertora:$@ \
	--settings -cache=certora-run-cdai

spec/certora/NErc20/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/NErc20ImmutableCertora.sol \
	 spec/certora/contracts/NTokenCollateral.sol \
	 spec/certora/contracts/NiutrollerCertora.sol \
	 spec/certora/contracts/InterestRateModelModel.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	--link \
	 NErc20ImmutableCertora:otherToken=NTokenCollateral \
	 NErc20ImmutableCertora:comptroller=NiutrollerCertora \
	 NErc20ImmutableCertora:underlying=UnderlyingModelNonStandard \
	 NErc20ImmutableCertora:interestRateModel=InterestRateModelModel \
	 NTokenCollateral:comptroller=NiutrollerCertora \
	 NTokenCollateral:underlying=UnderlyingModelNonStandard \
	--verify \
	 NErc20ImmutableCertora:$@ \
	--settings -cache=certora-run-cerc20-immutable

spec/certora/NErc20Delegator/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/NErc20DelegatorCertora.sol \
	 spec/certora/contracts/NErc20DelegateCertora.sol \
	 spec/certora/contracts/NTokenCollateral.sol \
	 spec/certora/contracts/NiutrollerCertora.sol \
	 spec/certora/contracts/InterestRateModelModel.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	--link \
	 NErc20DelegatorCertora:implementation=NErc20DelegateCertora \
	 NErc20DelegatorCertora:otherToken=NTokenCollateral \
	 NErc20DelegatorCertora:comptroller=NiutrollerCertora \
	 NErc20DelegatorCertora:underlying=UnderlyingModelNonStandard \
	 NErc20DelegatorCertora:interestRateModel=InterestRateModelModel \
	 NTokenCollateral:comptroller=NiutrollerCertora \
	 NTokenCollateral:underlying=UnderlyingModelNonStandard \
	--verify \
	 NErc20DelegatorCertora:$@ \
	--settings -assumeUnwindCond \
	--settings -cache=certora-run-cerc20-delegator

spec/certora/Maximillion/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/MaximillionCertora.sol \
	 spec/certora/contracts/CEtherCertora.sol \
	--link \
	 MaximillionCertora:nEther=CEtherCertora \
	--verify \
	 MaximillionCertora:$@

spec/certora/Timelock/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/TimelockCertora.sol \
	--verify \
	 TimelockCertora:$@

certora-clean:
	rm -rf .certora_build.json .certora_config certora_verify.json emv-*
