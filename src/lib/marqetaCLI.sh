#! /usr/bin/env bash
#
# Super Crude Marqeta CLI for Dirty Debugging
#
# Dependancies:
# - fzf `brew install fzf`
# - others that may be installed already (curl, base64, awk, xargs)
# - api url and credentials: MARQETA_ACCESS_TOKEN, MARQETA_APPLICATION_TOKEN and MARQETA_BASE_URL
#
MARQETA_API_URL=$MARQETA_BASE_URL
MARQETA_API_AUTH_TOKEN="$(echo -n "$MARQETA_APPLICATION_TOKEN:$MARQETA_ACCESS_TOKEN" | base64)"

USER_TOKEN=""
CARD_TOKEN=""
CARD_PRODUCT_TOKEN=""
DEPOSIT_ACCOUNT_TOKEN=""
ROUTING=
ACCOUNT_NUMBER=
NAME_ON_ACCOUNT=""
FUNDING_SOURCE_TOKEN=""
DIRECT_DEPOSIT_TOKEN=""

choice=$(awk '/^        #REQUEST/{print $2" "$3" "$4" "$5" "$6" "$7" "$8}' $0 | fzf | xargs)
case $choice in
    'create user')
        #REQUEST create user
        curl -X POST "${MARQETA_API_URL}users"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"first_name\":\"Andy\",\"last_name\":\"Delgado\",\"address1\":\"1234 Grove Street\",\"city\":\"Berkeley\",\"state\":\"CA\",\"postal_code\":\"94702\",\"country\":\"USA\",\"birth_date\":\"1989-07-23\",\"ssn\":\"666666666\"}"
        ;;
    'list all users')
        #REQUEST list all users
        curl -X GET "${MARQETA_API_URL}users"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    'list card products')
        #REQUEST list card products
        curl -X GET "${MARQETA_API_URL}cardproducts"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    'create card product')
        #REQUEST create card product
        curl -X POST "${MARQETA_API_URL}cardproducts"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"name\":\"New Card Product\",\"start_date\":\"2019-08-24\"}"
        ;;
    'create card')
        #REQUEST create card
        curl -X POST "${MARQETA_API_URL}cards"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"card_product_token\":\"$CARD_PRODUCT_TOKEN\",\"user_token\":\"$USER_TOKEN\"}"
        ;;
    'list cards for user')
        #REQUEST list cards for user
        curl -X GET "${MARQETA_API_URL}cards/user/$USER_TOKEN"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    'pass kyc')
        #REQUEST pass kyc
        curl -X POST "${MARQETA_API_URL}kyc"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"user_token\":\"$USER_TOKEN\",\"manual_override\":true}"
        ;;
    'activate user')
        #REQUEST activate user
        curl -X POST "${MARQETA_API_URL}usertransitions"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN"  -d "{\"status\":\"ACTIVE\",\"reason_code\":\"00\",\"channel\":\"API\",\"user_token\":\"$USER_TOKEN\"}"
        ;;
    'activate card')
        #REQUEST activate card
        curl -X POST "${MARQETA_API_URL}cardtransitions"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"card_token\":\"$CARD_TOKEN\",\"channel\":\"API\",\"state\":\"ACTIVE\",\"reason_code\":\"00\"}"
        ;;
    'deactivate card')
        #REQUEST deactivate card
        curl -X POST "${MARQETA_API_URL}cardtransitions"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"card_token\":\"$CARD_TOKEN\",\"channel\":\"API\",\"state\":\"SUSPENDED\",\"reason_code\":\"00\"}"
        ;;
    'list webhooks')
        #REQUEST list webhooks
        curl -X GET "${MARQETA_API_URL}webhooks"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    'create a deposit account')
        #REQUEST create a deposit account
        curl -X POST "${MARQETA_API_URL}depositaccounts"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"user_token\":\"$USER_TOKEN\" }"
        ;;
    'list deposit accounts for user')
        #REQUEST list deposit accounts for user
        curl -X GET "${MARQETA_API_URL}depositaccounts/user/$USER_TOKEN"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;

    'simulate direct deposit credit')
        #REQUEST simulate direct deposit credit
        curl -X POST "${MARQETA_API_URL}simulations/directdeposits/credit"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"amount\":100.00,\"account_number\":\"$ACCOUNT_NUMBER\",\"settlement_date\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"earlyPayEligible\":true}"
        ;;
    'simulate ach credit')
        #REQUEST simulate ach credit 
        curl -X POST "${MARQETA_API_URL}simulate/directdeposits"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"amount\":100.00,\"account_number\":\"$ACCOUNT_NUMBER\",\"settlement_date\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"type\":\"CREDIT\",\"earlyPayEligible\":true}"
        ;;
    'simulate ach debit')
        #REQUEST simulate ach debit
        curl -X POST "${MARQETA_API_URL}simulate/directdeposits"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"amount\":100.00,\"account_number\":\"$ACCOUNT_NUMBER\",\"settlement_date\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"type\":\"DEBIT\"}"
        ;;
    'simulate an authorization')
        #REQUEST simulate an authorization
        curl -X POST "${MARQETA_API_URL}simulate/authorization"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"amount\":10,\"card_token\":\"$CARD_TOKEN\",\"mid\":\"3008\"}"
        ;;
    'simulate a card transaction authorization')
        #REQUEST simulate a card transaction authorization
        curl -X POST "${MARQETA_API_URL}simulations/cardtransactions/authorization"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"card_token\":\"$CARD_TOKEN\",\"amount\":10,\"card_acceptor\":{\"mid\":\"11111\"},\"network\":\"VISA\",\"EarlyPayEligible\":false}"
        ;;
    'get direct deposit')
        #REQUEST get direct deposit
        curl -X GET "${MARQETA_API_URL}directdeposits/$DIRECT_DEPOSIT_TOKEN"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    'get direct deposits')
        #REQUEST get direct deposits
        curl -X GET "${MARQETA_API_URL}directdeposits"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    'transition direct deposit to applied')
        #REQUEST transition direct deposit to applied
        curl -X POST "${MARQETA_API_URL}directdeposits/transitions"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"channel\":\"API\",\"direct_deposit_token\":\"$DIRECT_DEPOSIT_TOKEN\",\"state\":\"APPLIED\",\"reason\":\"Manual state change\"}"
        ;;
    'get balance for user')
        #REQUEST get balance for user
        curl -X GET "${MARQETA_API_URL}balances/$USER_TOKEN"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    'list ach transfers for user')
        #REQUEST list ach transfers for user 
        curl -X GET "${MARQETA_API_URL}banktransfers/ach/?user_token=${USER_TOKEN}"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"amount\":100.00,\"account_number\":\"$ACCOUNT_NUMBER\",\"settlement_date\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",\"type\":\"DEBIT\"}"
        ;;
    'create ach funding source')
        #REQUEST create ach funding source 
        curl -X POST "${MARQETA_API_URL}fundingsources/ach"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"account_number\":\"${ACCOUNT_NUMBER}\",\"routing_number\":\"${ROUTING}\",\"name_on_account\":\"${NAME_ON_ACCOUNT}\",\"account_type\":\"checking\",\"user_token\":\"${USER_TOKEN}\"}"
        ;;

    'verify ach -- add 2 verify deposits')
        #REQUEST verify ach -- add 2 verify deposits 
        curl -X PUT "${MARQETA_API_URL}fundingsources/ach/${FUNDING_SOURCE_TOKEN}"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"active\":false,\"verify_amount1\":\"0.22\",\"verify_amount2\":\"0.11\" }"
        ;;
    'create gpa order')
        #REQUEST create gpa order
        curl -X POST "${MARQETA_API_URL}gpaorders"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{\"amount\":100,\"currency_code\":\"USD\",\"funding_source_token\":\"${FUNDING_SOURCE_TOKEN}\",\"user_token\":\"${USER_TOKEN}\"}"
        ;;
    'get direct deposit records for user')
        #REQUEST get direct deposit records for user 
        curl -X GET "${MARQETA_API_URL}directdeposits/?user_token=${USER_TOKEN}"  -H "accept: application/json" -H "Content-Type: application/json" -H "Authorization: Basic $MARQETA_API_AUTH_TOKEN" -d "{}"
        ;;
    # It is a common practice to use the wildcard asterisk symbol (*) as a final
    # pattern to define the default case. This pattern will always match.
    *)
        echo "Invalid option $choice"
        exit 0
    ;;
esac


