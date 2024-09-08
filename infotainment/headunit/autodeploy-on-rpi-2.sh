#!/bin/bash

GITHUB_API_BASE_URL="https://api.github.com"
GITHUB_TOKEN="<INSERT-TOKEN-HERE>"
org="mad201802"
repo="asl-gokart"
response_file="tmp/releases-latest.json"

# Ask which version to download
echo "Which version should be downloaded? 1) latest or 2) other"
read -p "Enter 1 or 2: " version_choice

if [[ $version_choice == "1" ]]; then
    # Download latest release
    echo "Fetching the latest release..."
    response=$(curl -sH "Authorization: Bearer ${GITHUB_TOKEN}" "${GITHUB_API_BASE_URL}/repos/${org}/${repo}/releases/latest" > ${response_file})
    asset_id=$(cat ${response_file} | jq -r '.assets[0].id')
    asset_name=$(cat ${response_file} | jq -r '.assets[0].name')
    version_name=$(cat ${response_file} | jq -r '.tag_name')

    echo "Latest version: $version_name"
elif [[ $version_choice == "2" ]]; then
    # Fetch all available releases
    echo "Fetching all available releases..."
    response_all_releases="tmp/releases-all.json"
    curl -sH "Authorization: Bearer ${GITHUB_TOKEN}" "${GITHUB_API_BASE_URL}/repos/${org}/${repo}/releases" > ${response_all_releases}
    
    # List all available releases
    echo "Available releases:"
    release_count=$(jq '. | length' ${response_all_releases})
    for i in $(seq 0 $(($release_count-1))); do
        release_name=$(jq -r ".[$i].tag_name" ${response_all_releases})
        echo "$(($i + 1))) $release_name"
    done

    # Let the user select a release
    read -p "Select the number corresponding to the release you want to download: " selected_release_number


    if [[ $selected_release_number -lt 1 || $selected_release_number -gt $release_count ]]; then
        echo "Invalid input. Please run the script again and select a valid release number."
        exit 1
    else
        selected_release_index=$(($selected_release_number - 1))
        asset_id=$(jq -r ".[$selected_release_index].assets[0].id" ${response_all_releases})
        asset_name=$(jq -r ".[$selected_release_index].assets[0].name" ${response_all_releases})
        version_name=$(jq -r ".[$selected_release_index].tag_name" ${response_all_releases})
        echo "Selected version: $version_name"
else
    echo "Invalid input. Please run the script again and select either 1 or 2."
    exit 1
fi

# Ask whether to download or install
echo "Do you want to 1) just download or 2) download and install [$version_name]?"
read -p "Enter 1 or 2: " download_or_install

if [[ $download_or_install == "1" ]]; then
    echo "Downloading version $version_name..."
    curl -L -H "Accept: application/octet-stream" -H "Authorization: Bearer ${GITHUB_TOKEN}" "${GITHUB_API_BASE_URL}/repos/${org}/${repo}/releases/assets/${asset_id}" -o "${asset_name}"
    echo "Download complete: ${asset_name}"
elif [[ $download_or_install == "2" ]]; then
    echo "Downloading and installing version $version_name..."
    curl -L -H "Accept: application/octet-stream" -H "Authorization: Bearer ${GITHUB_TOKEN}" "${GITHUB_API_BASE_URL}/repos/${org}/${repo}/releases/assets/${asset_id}" -o "tmp/${asset_name}.downloaded"
    echo "Download complete: tmp/${asset_name}"
    sudo dpkg -i "tmp/${asset_name}.downloaded"
    echo "Installation complete!"
else
    echo "Invalid input. Please run the script again and select either 1 or 2."
    exit 1
fi
