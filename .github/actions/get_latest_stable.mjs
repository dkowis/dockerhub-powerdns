import {graphql} from "@octokit/graphql";
import fs from 'fs';
const semverSort = require('semver-sort');
// want to get the apis for Powerdns and tags and filter out things for what we want

const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`
    }
});

async function versionsForProduct(productPrefix) {
    //Fixed query with actual ordering, gosh I'm dumb.
    const recursorVersions = await graphqlWithAuth(
        `
        query MyQuery {
            repository(name: "pdns", owner: "PowerDNS") {
              refs(refPrefix: "refs/tags/", first: 20, query: "${productPrefix}", orderBy: {
                field:TAG_COMMIT_DATE,
                direction: DESC
              }) {
                nodes {
                  name
                  prefix
                }
                totalCount
              }
            }
          }
        `
    );

    const versions = recursorVersions.repository.refs.nodes

    //Convert all the versions to semantic ones, and sort them
    const sorted = semverSort.desc(versions)

    const filtered = sorted.filter((item) => {
        console.log(`Checking Version ${item.name}`);
        //If the name includes a hyphen, then it's got a alpha or pre-release we don't want
        return !item.name.replace(productPrefix, '').includes('-');
    });
    //TODO: "latest stable" might not actually be the newest tag, because bugfixes, I need to pick the largest thing.
    console.log(`picked out ${filtered.at(0).name}`);

    const latestStable = filtered.at(0).name.replace(productPrefix, '');
    return latestStable;
}

const latestStableRecursor = await versionsForProduct("rec-");
const latestStableDnsdist = await versionsForProduct("dnsdist-");
const latestStableAuth = await versionsForProduct("auth-");

const data =
    `recursorVersion=${latestStableRecursor}
dnsdistVersion=${latestStableDnsdist}
authVersion=${latestStableAuth}`;

if (process.env.GITHUB_OUTPUT) {
    fs.writeFile(process.env.GITHUB_OUTPUT, data, (err) => {
        // In case of a error throw err.
        if (err) throw err;
    })
} else {
    console.log(data);
}