import {graphql} from "@octokit/graphql";
import fs from 'fs';
// want to get the apis for Powerdns and tags and filter out things for what we want

const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`
    }
});

async function versionsForProduct(productPrefix) {
    const recursorVersions = await graphqlWithAuth(
        `
            query MyQuery {
            repository(name: "pdns", owner: "PowerDNS") {
            refs(refPrefix: "refs/tags/", last: 20, query: "${productPrefix}") {
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
    const filtered = versions.filter((item) => {
        //If the name includes a hyphen, then it's got a alpha or pre-release we don't want
        return !item.name.replace(productPrefix, '').includes('-');
    });

    const latestStable = filtered.at(-1).name.replace(productPrefix, '');
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