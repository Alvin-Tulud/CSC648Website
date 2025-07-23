# Credentials Folder

## The purpose of this folder is to store all credentials needed to log into your server and databases. This is important for many reasons. But the two most important reasons is
    1. Grading , servers and databases will be logged into to check code and functionality of application. Not changes will be unless directed and coordinated with the team.
    2. Help. If a class TA or class CTO needs to help a team with an issue, this folder will help facilitate this giving the TA or CTO all needed info AND instructions for logging into your team's server. 


# Below is a list of items required. Missing items will causes points to be deducted from multiple milestone submissions.

1. Server URL or IP: https://demo.team10-app.online/   or  IP: 18.116.19.164  FULL: ubuntu@ec2-18-116-19-164.us-east-2.compute.amazonaws.com
2. SSH username: ubuntu
3. SSH password or key: cto-key.pem
    <br> If a ssh key is used please upload the key to the credentials folder.
4. Database URL or IP and port used:  URL: mysql://team_user:Myteampass10@localhost/team10   and IP: 3306
    <br><strong> NOTE THIS DOES NOT MEAN YOUR DATABASE NEEDS A PUBLIC FACING PORT.</strong> But knowing the IP and port number will help with SSH tunneling into the database. The default port is more than sufficient for this class.
5. Database username: team_user
6. Database password: Myteampass10
7. Database name (basically the name that contains all your tables): team10
8. Instructions on how to use the above information.
    How to Connect via SSH:
    Download they SSH key
    Give it permission: sudo chmod 400 “key”
    ssh -i “key” ubuntu@”server IP”
    Connect to Database:
         Option 1:
    Login server
    Command : mysql -u team_user -p
    Type in: “Database password”
   
    Connect from WorkBench:
    Choose Standard (TCP/IP) over SSH
    Hostname: Server IP
    User: ubuntu
    Choose the key.
    MySQL hostname : localhost
    Leave the port default : 3306
    Username:  team_user
    Pass: Myteampass10

# Most important things to Remember
## These values need to kept update to date throughout the semester. <br>
## <strong>Failure to do so will result it points be deducted from milestone submissions.</strong><br>
## You may store the most of the above in this README.md file. DO NOT Store the SSH key or any keys in this README.md file.
