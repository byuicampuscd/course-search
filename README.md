#Course Search
The course search is installed is used to search through all the content of a course. You can search for just content or content and html. It supports searching with regular expressions. 

In order to search a course you first add the course search page to a course. Go to the Content tab of the course you would like to search & create a new file anywhere in the page. Name the file Course Search. Open the HTML editor for Course Search and paste the following code (index.html) into the page:
```
<!DOCTYPE html>
<html lang="en-us">

<head>
    <meta charset="utf-8">
    <title>BYU-Idaho</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://content.byui.edu/integ/gen/2291aecd-be53-49eb-beff-9222931c76d1/0/styles.css" />
</head>

<body>
    <div id="main"></div>
    <script src="https://content.byui.edu/integ/gen/2291aecd-be53-49eb-beff-9222931c76d1/0/buildPage.js"></script>
</body>

</html>
```

Save Changes & publish the page. Then under the Activity Details tab select the add dates and restrictions option. Click create under the heading Release Conditions.
In the following pop-up box select the following values:
- Condition type: Role in current org unit
- Criteria: Enrolled as
- Role: Designer(Full)

The Search button and the Check Links button run 2 different functions. Check links searches the course & finds all links with empty or invalid link locations. The Search button looks for whatever criteria you specify

