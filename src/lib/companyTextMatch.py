#!/usr/bin/env python
# coding: utf-8


from optparse import OptionParser
parser = OptionParser()

parser.add_option("--brand_db", action= "store", dest="brand_df", help = 'brand database csv file', type=str)
parser.add_option("--transaction_db", action= "store", dest="brand_transactions", help = 'Plaid transaction database csv file', type=str)
#parser.add_option("--matched_all", action= "store", dest="matched_all", help = 'What you want to name the matched csv file', type=str)
parser.add_option("--Manual_match", action= "store", dest="manual_matches", help = 'csv file with manually matched false negatives', type=str)
parser.add_option("--False_pos", action= "store", dest="False_pos", help = 'csv file with False positives', type=str)
parser.add_option("--matched_unique", action= "store", dest="matched_unique", help = 'What you want to name the unique matched companies csv file', type=str)
parser.add_option("--unmatched", action= "store", dest="unmatched_unique", help = 'What you want to name the unmatched companies(unique) csv file', type=str)
parser.add_option("--threshold_1",dest = "Algo_1_thresh", help = 'Provide a number between 0 and 1 to set as threshold. Conservative: 0.45, Non-conservative: 0.24', type=float)
parser.add_option("--threshold_2",dest = "Algo_2_thresh", help = 'Provide a number between 0 and 1 to set as threshold. Conservative: 0.91, Non-conservative: 0.80', type=float)
#parser.add_option("--threshold_3",dest = "Algo_3_thresh", help = 'Provide a number between 0 and 1 to set as threshold. Conservative: 0.61, Non-conservative: 0.46', type=float)


(options, args) = parser.parse_args()
brand_df_str = options.brand_df
brand_transactions_str = options.brand_transactions
#matched_data_all_str = options.matched_all
matched_data_unique_str = options.matched_unique
unmatched_data_str = options.unmatched_unique
algo_1_thresh = options.Algo_1_thresh
algo_2_thresh = options.Algo_2_thresh
#algo_3_thresh = options.Algo_3_thresh
manual_matches = options.manual_matches
False_pos = options.False_pos

#pip install pip
import os 
# os.system("pip install fuzzywuzzy")
# os.system("pip install fuzzymatcher")
# os.system("pip install pandas")
# os.system("pip install numpy")
# os.system("pip install cython")
# os.system("pip install re")
# os.system("pip install string_grouper")
# os.system("pip install time")
# os.system("pip install cleanco")
# os.system("pip install openpyxl")


from fuzzywuzzy import fuzz
from fuzzywuzzy import process
from pathlib import Path
import fuzzymatcher
import re, cleanco
import pandas as pd
import numpy as np
from cleanco import cleanco
# from cleanco import basename
import numpy as np
import cython
import string_grouper
from string_grouper import match_strings, match_most_similar, group_similar_strings, StringGrouper
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import re

#read data
Revised = pd.read_csv(manual_matches)
False_pos = pd.read_csv(False_pos)
brand_df = pd.read_csv(brand_df_str) #Our database, we skip the first row because the columns start at row 2
brand_transactions = pd.read_csv(brand_transactions_str) #plaid transactions


brand_df = brand_df.loc[:,['_id','companyName']]#Extract just the company name from our database, and not the badges, scores etc
brand_transactions = brand_transactions.loc[:,['merchant_name','name']]#Extract just the transaction company name

brand_transactions['original'] = brand_transactions['merchant_name'].values
brand_transactions['original'].fillna(brand_transactions['name'], inplace = True)
brand_transactions.loc[brand_transactions['name']=="KAYAK HANALEI",'original'] = 'KAYAK HANALEI'
brand_transactions.loc[brand_transactions['name'] =="Uber Eats" , 'original'] = 'UBER EATS'
brand_transactions = pd.DataFrame(brand_transactions['original'])

#Fill nans with empty string
brand_transactions['original'] = brand_transactions['original'].fillna('')
brand_df['companyName'] = brand_df['companyName'].fillna('')


brand_transactions['original'] = brand_transactions['original'].apply(str)
brand_df['companyName'] = brand_df['companyName'].apply(str)
brand_transactions_unique =  brand_transactions.drop_duplicates(subset = 'original', keep = 'first') #Drop all the duplicate transaction names, this contains just unique transactions


#Running text match for the unique companies
#creating a new column to store a normalized version of the name
brand_transactions_unique = brand_transactions_unique.assign(brand_normalized=brand_transactions_unique.original)
brand_df = brand_df.assign(brand_normalized = brand_df['companyName'])

# Convert to uppercase
brand_df.brand_normalized = brand_df.brand_normalized.str.upper()
brand_transactions_unique.brand_normalized = brand_transactions_unique.brand_normalized.str.upper()

char_to_replace = {
                    'W/D':'',
                    ' AND':' & ',
                    '\sINC': '',
                    '\sINCORPORATED':'',
                    '\sCORPORATION': '',
                    '\sCORP': '',
                    '\sCOMPANIES':'',
                    '\sCOMPANY':'',
                    '\sCO':'',
                    '\sLLC':'',
                   '\sLIMITED':'',
                   '\sLTD':'',
                   '\sHOLDINGS':'',
                   '\sHOLDING':'',
                   '\sPLC':'',
                   '\sPBC':'',
                   '\sLP':'',
                   '\sGROUP':'',
                   '\.COM':'',
                    '#': '',
                    '\d+':'',
                    '.': '',
                    'GIFTCARD': '',
                    ',':'',
                    '-':'',
                    "'":'',
                    'r"\(.*\)"':'',
                    }

#Iterate over all key-value pairs in dictionary
for key, value in char_to_replace.items():
        # Replace key character with value character in string
    brand_df.brand_normalized = brand_df.brand_normalized.str.replace(key, value, regex=True)
    brand_transactions_unique.brand_normalized = brand_transactions_unique.brand_normalized.str.replace(key, value, regex=True)


    # Remove spaces in the beginning/end
brand_df.brand_normalized = brand_df.brand_normalized.str.strip()
brand_transactions_unique.brand_normalized = brand_transactions_unique.brand_normalized.str.strip()

brand_df = brand_df.fillna("NULL") #Fill NAN with null string. Some normalized versions turn into NAN; for example, one of the companies name was 365, 
                                       #so the normalized version was NAN and the code below wont work for NAN
    
#ALGO 1
#fuzzy left join
left_on = ["brand_normalized"] #join on the brand_normalized column
right_on = ["brand_normalized"]
matches_fuzzy = fuzzymatcher.fuzzy_left_join(brand_transactions_unique, brand_df, left_on, right_on)
#matches_fuzzy.to_csv("./Output/Matches_algo_1.csv")#Outputs a csv file with the matches just for this algo



#ALGO 2
#match_strings
matches_string_grouper = match_strings(brand_transactions_unique['brand_normalized'], brand_df['brand_normalized'])

#The algo returns just the  normalized brand, we want the original brand name so we use the index to locate it
brand_transactions_unique_index = matches_string_grouper['left_index'].tolist()
brand_df_index = matches_string_grouper['right_index'].tolist()
matches_string_grouper['Transaction name DB'] = brand_transactions_unique.loc[brand_transactions_unique_index,'original'].tolist()
matches_string_grouper['companyName DB'] = brand_df.loc[brand_df_index,'companyName'].tolist()
#matches_string_grouper.to_csv("./Output/Matches_algo_2.csv")#Ouput csv file with this algo

#Algo 1, setting a threshold
matches_fuzzy_bestidx = np.where(matches_fuzzy['best_match_score'] >= algo_1_thresh) #Find the index where the match score is >0.28
MATCHES_fuzzy = matches_fuzzy.iloc[matches_fuzzy_bestidx] 
MATCHES_fuzzy = MATCHES_fuzzy.loc[:,['original','companyName','best_match_score']]#Extract the columns original, Company Name and best_match_score

#Algo 2, setting a threshold
matches_sg_bestidx= np.where(matches_string_grouper['similarity'] >= algo_2_thresh)
MATCHES_sg = matches_string_grouper.iloc[matches_sg_bestidx]
MATCHES_sg = MATCHES_sg.loc[:,['Transaction name DB','companyName DB','similarity']]


FINAL = pd.concat([MATCHES_fuzzy,MATCHES_sg.rename(columns = {'Transaction name DB':'original', 'companyName DB':'companyName','similarity':'best_match_score'})],ignore_index = True)


#Join company ID
Brand_df_no_dupes = brand_df.drop_duplicates(subset = "companyName",keep="first")
FINAL_MATCHES_ALL = FINAL.drop_duplicates(subset = "original", keep = "first") #Drop the matches that overlap between the three algorithms
del FINAL_MATCHES_ALL['best_match_score']#don't need this column

Matches_unique =  pd.merge(FINAL_MATCHES_ALL,Brand_df_no_dupes, on="companyName", how="left")
Matches_unique = Matches_unique.loc[:,['original','companyName','_id']]

#Dealing with False positives
Matches_unique = Matches_unique[~Matches_unique['original'].isin(False_pos['original'].tolist())]

#Dealing with manual false negatives
Unmatched = brand_transactions[~brand_transactions['original'].isin(Matches_unique['original'].tolist())]
Unmatched_unique= Unmatched.drop_duplicates(subset = "original",keep = "first")
Manual_matches_unique = pd.merge(Unmatched_unique,Revised, on="original") #Checks if any unmatched are in the manually matched data
Matches = pd.concat([Matches_unique,Manual_matches_unique],ignore_index = True)


#Storing the unmatched transactions
Unmatched = brand_transactions[~brand_transactions['original'].isin(Matches['original'].tolist())]
Unmatched_unique= Unmatched.drop_duplicates(subset = "original",keep = "first")




#Matching unmatched transactions to our matched transactions
#Matches_on_original= match_strings(Unmatched_unique['original'], Matches['original'],min_similarity=0.95)
#Matches_on_original = pd.merge(Matches_on_original,Matches, left_on = "right_original", right_on = "original")
#New_matches = Matches_on_original.loc[:,["left_original","companyName","_id"]]
#New_matches = New_matches.rename(columns = {'left_original':'original'})
#New_matches = New_matches.drop_duplicates(subset = "original")
#Matches = pd.concat([Matches,New_matches], ignore_index=True)

#storing unique matches
Matches.to_csv(matched_data_unique_str+".csv", index = False)

#Storing all the matched transactions
Total_matches = brand_transactions[brand_transactions['original'].isin(Matches['original'].tolist())] #Finds all matches in the transaction db based on the unique matched data
Matches_all = pd.merge(Total_matches,Matches,on='original')
Matches_all = Matches_all.loc[:,['original','companyName']]

#Matches_all.to_csv(matched_data_all_str+".csv",index=False)

#Recalculate Unmatched 
Unmatched = brand_transactions[~brand_transactions['original'].isin(Matches['original'].tolist())]
Unmatched_unique= Unmatched.drop_duplicates(subset = "original",keep = "first")

total_identified = len(Total_matches)/len(brand_transactions) #identification rate based on whole transaction dataset(not just unique)
total_identified_unique = len(Matches_unique)/len(brand_transactions_unique)#identification rate of unique companies


#Calculating # of occurence for unmatched.
#Calculate the transaction companies and their counts
brand_num_duplicates = Unmatched.pivot_table(columns=['original'], aggfunc='size').reset_index()
brand_num_duplicates = brand_num_duplicates.rename(columns={0:"count"})
brand_num_duplicates = brand_num_duplicates.sort_values('count', ascending=False) #sort to find the most mentioned companies
brand_num_duplicates.reset_index(inplace = True, drop = True)
brand_num_duplicates.to_csv(unmatched_data_str+".csv",index=False)