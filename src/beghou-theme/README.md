# About ThemeBuilder and this Theme

This theme was prepared using Telerik ThemeBuilder. It has Beghou branding, customizations and changes applied on top of the KendoReact Default theme. Read more [here](https://www.telerik.com/themebuilder).

ThemeBuilder is a tool that allows you to easily style your web UI including the [supported Kendo UI and Telerik components](https://docs.telerik.com/themebuilder/introduction#supported-telerik-and-kendo-ui-web-components) and any custom HTML.

ThemeBuilder enables developers to apply the styles from their style guide or design system to the components by using a generated [zip package](#about-this-zip-package) that contains Sass, CSS, and custom font files.

> Custom font files are available only if you have added them to your project.

## About this Zip Package

This zip package contains:

* The Sass, CSS, and custom font files from your ThemeBuilder project. These assets are in a folder named after your ThemeBuilder project.

> Kendo Font Icons font file is included only if your project uses font icons instead of SVG icons.

## Supported Telerik and Kendo UI Web Components

The team behind ThemeBuilder works constantly to expand the list of supported Telerik and Kendo UI web components that you can style with ThemeBuilder. Currently, ThemeBuilder supports the following component suites:

* [KendoReact](https://www.telerik.com/kendo-react-ui/)
* [Kendo UI for Angular](https://www.telerik.com/kendo-angular-ui)
* [Kendo UI for Vue](https://www.telerik.com/kendo-vue-ui)
* [Telerik UI for Blazor](https://www.telerik.com/blazor-ui)
* [Telerik UI for jQuery](https://www.telerik.com/kendo-jquery-ui)
* [Telerik UI for ASP.NET Core](https://www.telerik.com/aspnet-core-ui)
* [Telerik UI for ASP.NET MVC](https://www.telerik.com/aspnet-mvc)
* [Telerik UI for PHP](https://www.telerik.com/php-ui)
* [Telerik UI for JSP](https://www.telerik.com/jsp-ui)

**At Beghou, we use KendoReact.**

## Using the ThemeBuilder output in React

The generated ThemeBuilder output is packaged as an npm package. To use it, copy the ThemeBuilder package to your application and use it as a standard npm package:

1. Navigate to the folder named after your ThemeBuilder project, and then install the npm modules:

    ```shell
    cd beghou-theme
    npm install
    ```

1. Add the ThemeBuilder package in your application's <code>package.json</code> file:

    ```js
      "dependencies": {
        ...
        "beghou-theme": "file:./beghou-theme"
      },
    ```

    >The <code>file:./beghou-theme</code> value is the relative path to the <code>beghou-theme</code> folder. For example, if you put it next to your application folder, the value will be <code>file:../beghou-theme</code>.

1. Install the ThemeBuilder package in your project:

    ```shell
    cd ..
    npm install
    ```

1. Import the theme package styles into your application — import CSS in your application root JS (e.g. <code>app.js</code>) file:

    ```js
    import 'beghou-theme/dist/css/beghou-theme.css';
    ```

    > **Beghou:** always use the compiled CSS import above. Building from the Sass sources (<code>dist/scss</code>) produces the raw ThemeBuilder output without the processed overrides this theme ships with — several Beghou styles will silently not apply. See the repo root README.

  > Make sure the theme package styles are imported before all your application-specific styles.

  > Since generated package already contains a reference to the Kendo theme, you do not need to manually add it to your project.
